// ============================================================
// CURA-X Chat page — UI v2 (light/dark aware, fixed app-shell layout)
// Previous dark-only version preserved at: project/legacy/Chatbot.v1-dark.tsx
// Logic (auth header, /api/chat route, clean history, retry) is unchanged.
// ============================================================
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Send,
  Plus,
  Settings,
  User,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  Activity,
  Globe,
  Brain,
  MessageSquare,
  Menu,
  X,
  Mic,
  AlertCircle,
  RotateCcw,
  Sun,
  Moon,
  Thermometer,
  Pill,
  Stethoscope,
  HeartPulse,
  Loader2,
  CloudOff,
  Pencil,
  Trash2,
} from 'lucide-react';

import { Message, ChatResponse, Language, ChatHistoryItem } from '../types/api';
import { ResponseCard } from '../components/chat/ResponseCard';
import { buildResponseMeta, refreshPreviewMeta } from '../services/responseMeta';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { chatAPI } from '../services/api';

interface SidebarContentProps {
  isMemoryOn: boolean;
  setIsMemoryOn: (value: boolean) => void;
  chatHistory: ChatHistoryItem[];
  onClose?: () => void;
  onNewChat?: () => void;
  activeChatId?: string | null;
  onSelectChat?: (id: string) => void;
  isLoadingHistory?: boolean;
  isBusy?: boolean; // a reply is in flight — switching is paused
  onRenameChat?: (id: string, title: string) => void;
  onDeleteChat?: (id: string) => void;
}

// ---- OLD local-only session store (replaced by MongoDB persistence) ----
// interface LocalSession extends ChatHistoryItem { messages: Message[]; }

// Shapes returned by the existing /api/chats routes
interface ServerChatSummary { sessionId: string; title: string; updatedAt: string; }
interface ServerMessage { role: 'user' | 'assistant' | 'system'; content: string; timestamp: string; meta?: Message['meta']; }

const relativeTime = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  if (hrs < 48) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const toHistoryItem = (c: ServerChatSummary): ChatHistoryItem => ({
  id: c.sessionId, title: c.title, updatedAt: c.updatedAt, time: relativeTime(c.updatedAt),
});

const fromServerMessages = (msgs: ServerMessage[]): Message[] =>
  msgs
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map((m, i) => ({
      id: new Date(m.timestamp).getTime() * 100 + i, // unique + stable within a chat
      type: m.role === 'user' ? 'user' : 'bot',
      content: m.content,
      timestamp: new Date(m.timestamp),
      meta: refreshPreviewMeta(m.meta), // old saved samples → current generic preview
    }));

const titleFrom = (text: string) => (text.length > 60 ? text.slice(0, 60).trimEnd() + '…' : text);

const GREETING = "Hello! I'm Cura, your AI healthcare assistant. Feel free to ask about your symptoms, conditions, medications, or any health-related questions. How can I help you today?";

const SUGGESTED_PROMPTS = [
  { icon: Thermometer, text: 'I have a fever since yesterday, what should I do?' },
  { icon: Stethoscope, text: 'I have a cold and sore throat — home remedies?' },
  { icon: HeartPulse, text: 'What is chronic arthritis?' },
  { icon: Pill, text: 'Can I take ibuprofen with paracetamol?' },
];

// Shown while waiting — mirrors the planned CURA-X pipeline stages.
const LOADING_STEPS = [
  'Understanding your question…',
  'Checking medical knowledge…',
  'Preparing a safe answer…',
];

// Response languages the backend supports (EN unchanged; ES via prompt instruction)
const SUPPORTED_LANGS = ['EN', 'ES', 'HI'];
const LANG_KEY = 'cura:lang';

const makeGreeting = (): Message => ({ id: 1, type: 'bot', content: GREETING, timestamp: new Date() });

// Error strings that should never be sent back to the model as history
const ERROR_PREFIXES = [
  "I'm sorry, I'm having trouble",
  "I'm sorry, I wasn't able to generate",
  "I apologize, but I couldn't",
  "Hello! I'm Cura",  // skip the initial greeting too
];

const isErrorMessage = (content: string) =>
  ERROR_PREFIXES.some(prefix => content.startsWith(prefix));

// Shared style tokens (light first, dark via `dark:`)
const iconBtn =
  'p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors';

const Chatbot: React.FC = () => {
  const { isDark, toggleTheme } = useTheme();
  const [messages, setMessages] = useState<Message[]>([makeGreeting()]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isMemoryOn, setIsMemoryOn] = useState<boolean>(true);
  // OLD: const [selectedLanguage, setSelectedLanguage] = useState<string>('EN');
  // Remembered across refreshes; only EN / ES are supported.
  const [selectedLanguage, _setSelectedLanguage] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(LANG_KEY);
      return saved && SUPPORTED_LANGS.includes(saved) ? saved : 'EN';
    } catch { return 'EN'; }
  });
  const setSelectedLanguage = (code: string) => {
    if (!SUPPORTED_LANGS.includes(code)) return;
    _setSelectedLanguage(code);
    try { localStorage.setItem(LANG_KEY, code); } catch { /* ignore */ }
  };
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<number>(0);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<Record<number, 'up' | 'down'>>({});
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ChatHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(true);
  const [isLoadingChat, setIsLoadingChat] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string>('');
  const [activeChatId, _setActiveChatId] = useState<string | null>(null);
  // Ref mirror so async callbacks see the *current* conversation
  const activeChatRef = useRef<string | null>(null);
  const lastChatKey = user?.email ? `cura:lastChat:${user.email}` : null;
  const setActiveChatId = (id: string | null) => {
    activeChatRef.current = id;
    _setActiveChatId(id);
    try {
      if (!lastChatKey) return;
      if (id) localStorage.setItem(lastChatKey, id); else localStorage.removeItem(lastChatKey);
    } catch { /* storage unavailable — ignore */ }
  };
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // UI only for now — multilingual processing arrives in Phase 6. Code is sent to the backend already.
  const languages: Language[] = [
    { code: 'EN', name: 'English' },
    { code: 'HI', name: 'हिन्दी' },
    // Disabled for now — not supported by the backend yet:
    // { code: 'TE', name: 'తెలుగు' },
    // { code: 'TA', name: 'தமிழ்' },
    { code: 'ES', name: 'Español' },
  ];

  // ---- OLD: const chatHistory = sessions.map(({ id, title, time }) => ({ id, title, time }));
  const chatHistory: ChatHistoryItem[] = sessions;

  // Only the message pane scrolls — keep it pinned to the newest message
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, isLoading]);

  // Cycle loading-stage text while waiting
  useEffect(() => {
    if (!isLoading) { setLoadingStep(0); return; }
    const t = setInterval(() => setLoadingStep(s => Math.min(s + 1, LOADING_STEPS.length - 1)), 1200);
    return () => clearInterval(t);
  }, [isLoading]);

  // Auto-grow textarea (capped; it scrolls internally beyond that)
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [inputMessage]);

  // Close mobile drawer with Escape
  useEffect(() => {
    if (!isSidebarOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setIsSidebarOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isSidebarOpen]);

  const hasConversation = messages.some(m => m.type === 'user');
  // The greeting is replaced visually by the welcome panel
  const visibleMessages = messages.filter(m => m.content !== GREETING);

  // ---- OLD local saveCurrentSession() (kept in project/legacy/Chatbot.v1-dark.tsx):
  // conversations are now saved to MongoDB message-by-message (see handleSendMessage).

  // Move a conversation to the top of the sidebar with a fresh timestamp
  const touchSession = (id: string) => {
    const now = new Date().toISOString();
    setSessions(prev => {
      const found = prev.find(s => s.id === id);
      if (!found) return prev;
      return [{ ...found, updatedAt: now, time: relativeTime(now) }, ...prev.filter(s => s.id !== id)];
    });
  };

  // Load one conversation's messages from the backend
  const openChat = async (id: string) => {
    setIsLoadingChat(true);
    setSaveError('');
    try {
      const { chat } = await chatAPI.getChat(id);
      const loaded = fromServerMessages(chat.messages || []);
      setMessages([makeGreeting(), ...loaded]);
      // Continue a saved conversation in the language it was last answered in
      const lastLang = [...loaded].reverse().find(m => m.type === 'bot' && m.meta?.language)?.meta?.language;
      if (lastLang && SUPPORTED_LANGS.includes(lastLang)) setSelectedLanguage(lastLang);
      setActiveChatId(id);
    } catch (err) {
      console.error('Failed to load conversation:', err);
      setSessions(prev => prev.filter(s => s.id !== id)); // stale/deleted chat
      setMessages([makeGreeting()]);
      setActiveChatId(null);
    } finally {
      setIsLoadingChat(false);
    }
  };

  // On open: load the user's conversations and restore the last active one
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { chats } = await chatAPI.getChats();
        if (cancelled) return;
        const items = (chats as ServerChatSummary[]).map(toHistoryItem);
        setSessions(items);
        let last: string | null = null;
        try { last = lastChatKey ? localStorage.getItem(lastChatKey) : null; } catch { /* ignore */ }
        if (last && items.some(i => i.id === last)) await openChat(last);
      } catch (err) {
        console.error('Failed to load chat history:', err);
      } finally {
        if (!cancelled) setIsLoadingHistory(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastChatKey]);

  const handleNewChat = () => {
    if (isLoading) return;
    setMessages([makeGreeting()]);
    setActiveChatId(null);
    setSaveError('');
    setIsSidebarOpen(false);
    textareaRef.current?.focus();
  };

  const handleSelectChat = (id: string) => {
    setIsSidebarOpen(false);
    if (isLoading || id === activeChatRef.current) return;
    openChat(id);
  };

  // Rename: optimistic, rolled back if the server rejects it
  const handleRenameChat = async (id: string, rawTitle: string) => {
    const title = rawTitle.trim().slice(0, 80);
    const prev = sessions.find(s => s.id === id);
    if (!prev || !title || title === prev.title) return;
    setSessions(list => list.map(s => (s.id === id ? { ...s, title } : s)));
    try {
      await chatAPI.updateChatTitle(id, title);
    } catch (err) {
      console.error('Rename failed:', err);
      setSessions(list => list.map(s => (s.id === id ? { ...s, title: prev.title } : s)));
      setSaveError("Couldn't rename the conversation. Please try again.");
    }
  };

  // Delete: optimistic, restored in place if the server call fails
  const handleDeleteChat = async (id: string) => {
    const index = sessions.findIndex(s => s.id === id);
    if (index === -1) return;
    const removed = sessions[index];
    const wasActive = activeChatRef.current === id;
    if (wasActive && isLoading) return; // don't pull the rug from an in-flight reply
    setSessions(list => list.filter(s => s.id !== id));
    if (wasActive) {
      setMessages([makeGreeting()]);
      setActiveChatId(null);
      setSaveError('');
    }
    try {
      await chatAPI.deleteChat(id);
    } catch (err) {
      console.error('Delete failed:', err);
      setSessions(list => {
        const copy = [...list];
        copy.splice(Math.min(index, copy.length), 0, removed);
        return copy;
      });
      setSaveError("Couldn't delete the conversation. Please try again.");
    }
  };

  // `base` lets retry send against a trimmed list without stale-state issues.
  // `userAlreadySaved` is set by retry so the question isn't stored twice.
  const handleSendMessage = async (override?: string, base: Message[] = messages, userAlreadySaved = false): Promise<void> => {
    const text = (override ?? inputMessage).trim();
    if (!text || isLoading || isLoadingChat) return;

    const newUserMessage: Message = {
      id: Date.now(),
      type: 'user',
      content: text,
      timestamp: new Date()
    };

    setMessages([...base, newUserMessage]);
    const currentInput = text;
    setInputMessage('');
    setIsLoading(true);

    // ---- Persist the user's message (creates the conversation on first send).
    // Failures here never block the AI reply — the chat still works, just unsaved.
    let chatId = activeChatRef.current;
    try {
      if (!chatId) {
        const { chat } = await chatAPI.createChat(titleFrom(text));
        chatId = chat.sessionId as string;
        setActiveChatId(chatId);
        setSessions(prev => [toHistoryItem({ sessionId: chatId!, title: chat.title, updatedAt: new Date().toISOString() }), ...prev]);
      }
      if (!userAlreadySaved) await chatAPI.addMessage(chatId!, { role: 'user', content: text });
      touchSession(chatId!);
    } catch (err) {
      console.error('Failed to save message:', err);
      setSaveError("This conversation couldn't be saved. Replies still work, but may not appear after a refresh.");
    }

    try {
      // Frontend → Node /api/chat (JWT check) → Python /ai/chat → Groq
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: currentInput,
          language: selectedLanguage,
          memory: isMemoryOn,
          // Build clean history: only complete user→bot pairs, skip errors and greeting
          history: (() => {
            const pairs: { role: string; content: string }[] = [];
            const clean = base.filter(m => !m.isError && !isErrorMessage(m.content));
            for (let i = 0; i < clean.length - 1; i++) {
              const curr = clean[i];
              const next = clean[i + 1];
              if (curr.type === 'user' && next.type === 'bot') {
                pairs.push({ role: 'user', content: curr.content });
                pairs.push({ role: 'assistant', content: next.content });
                i++; // skip next, already consumed
              }
            }
            return pairs.slice(-10); // last 5 exchanges max
          })(),
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const detail = errData.details || errData.error || `Error ${response.status}`;
        throw new Error(detail);
      }

      const data: ChatResponse = await response.json();
      const replyOk = !!data.reply && !isErrorMessage(data.reply);

      const botResponse: Message = {
        id: Date.now() + 1,
        type: 'bot',
        content: data.reply || "I apologize, but I couldn't generate a response. Please try again.",
        timestamp: new Date(),
        // Structured metadata — real backend fields when present, preview/mock otherwise
        // OLD: meta: data.reply ? ... : undefined, isError: !data.reply
        // The server's "I'm sorry, I wasn't able to generate…" fallback is a failure too:
        // show it with "Try again" and never save it as a real answer.
        // Small talk (greetings, thanks) gets no confidence / sources / explanation card
        meta: replyOk && data.type !== 'smalltalk' ? buildResponseMeta(data, selectedLanguage) : undefined,
        isError: !replyOk,
      };

      // Only show the reply if the user is still looking at this conversation
      if (activeChatRef.current === chatId) setMessages(prev => [...prev, botResponse]);

      // Persist the assistant reply (with its metadata so it renders the same after reload)
      if (chatId && replyOk) {
        chatAPI.addMessage(chatId, { role: 'assistant', content: botResponse.content, meta: botResponse.meta })
          .then(() => touchSession(chatId!))
          .catch(err => {
            console.error('Failed to save reply:', err);
            setSaveError("This reply couldn't be saved. It may not appear after a refresh.");
          });
      }

    } catch (error) {
      console.error('Error sending message:', error);
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      const isConnError = errMsg.includes('fetch') || errMsg.includes('Failed to fetch') || errMsg.includes('NetworkError');

      const errorMessage: Message = {
        id: Date.now() + 1,
        type: 'bot',
        content: isConnError
          ? "I'm sorry, I'm having trouble connecting to the AI service. Please make sure the server is running and try again."
          : `Something went wrong: ${errMsg}`,
        timestamp: new Date(),
        isError: true,
      };

      // Errors are shown but never persisted
      if (activeChatRef.current === chatId) setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const copyMessage = (id: number, content: string): void => {
    navigator.clipboard.writeText(content).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(c => (c === id ? null : c)), 1500);
  };

  // Retry: resend the last user message
  const retryLast = () => {
    const lastUser = [...messages].reverse().find(m => m.type === 'user');
    if (!lastUser) return;
    // Drop the failed user message + error bubble(s); handleSendMessage re-adds the user message
    const idx = messages.findIndex(m => m.id === lastUser.id);
    // The question was already saved on the first attempt
    handleSendMessage(lastUser.content, messages.slice(0, idx), true);
  };

  const formatTime = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    // App shell: exactly one viewport tall; only the message pane scrolls.
    <div className="h-[100dvh] flex overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Mobile sidebar drawer */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Chat history">
          <div className="absolute inset-0 bg-slate-900/40 dark:bg-black/60" onClick={() => setIsSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-[85%] max-w-xs bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-xl">
            <SidebarContent
              isMemoryOn={isMemoryOn}
              setIsMemoryOn={setIsMemoryOn}
              chatHistory={chatHistory}
              onClose={() => setIsSidebarOpen(false)}
              onNewChat={handleNewChat}
              activeChatId={activeChatId}
              onSelectChat={handleSelectChat}
              isLoadingHistory={isLoadingHistory}
              isBusy={isLoading}
              onRenameChat={handleRenameChat}
              onDeleteChat={handleDeleteChat}
            />
          </aside>
        </div>
      )}

      {/* Desktop sidebar (fixed, own scroll) */}
      <aside className="hidden lg:flex w-72 flex-shrink-0 flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
        <SidebarContent
          isMemoryOn={isMemoryOn}
          setIsMemoryOn={setIsMemoryOn}
          chatHistory={chatHistory}
          onNewChat={handleNewChat}
          activeChatId={activeChatId}
          onSelectChat={handleSelectChat}
          isLoadingHistory={isLoadingHistory}
          isBusy={isLoading}
          onRenameChat={handleRenameChat}
          onDeleteChat={handleDeleteChat}
        />
      </aside>

      {/* Main column */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Header (fixed) */}
        <header className="flex-shrink-0 h-14 px-3 sm:px-5 flex items-center justify-between gap-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 min-w-0">
            <button onClick={() => setIsSidebarOpen(true)} className={`${iconBtn} lg:hidden`} aria-label="Open chat history">
              <Menu className="w-5 h-5" />
            </button>
            <Link to="/" className="flex items-center gap-2.5 min-w-0 rounded-lg" aria-label="CURA-X home">
              <span className="bg-violet-600 p-1.5 rounded-lg">
                <Activity className="h-4 w-4 text-white" />
              </span>
              <span className="min-w-0">
                <span className="block text-[15px] font-semibold leading-tight text-slate-900 dark:text-white">CURA-X</span>
                <span className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 leading-tight">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> AI health assistant
                </span>
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            {/* Language selector (UI only until Phase 6) */}
            <label className="flex items-center gap-1.5 h-9 pl-2.5 pr-1 rounded-lg border border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-600 focus-within:ring-2 focus-within:ring-violet-500/40 transition-colors">
              <Globe className="w-4 h-4 text-slate-400" aria-hidden />
              <select
                aria-label="Response language"
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="bg-transparent text-sm pr-1 focus:outline-none cursor-pointer"
              >
                {languages.map((lang) => (
                  <option key={lang.code} value={lang.code} className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100">
                    {lang.name}
                  </option>
                ))}
              </select>
            </label>
            <button onClick={toggleTheme} className={iconBtn} aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'} title={isDark ? 'Light theme' : 'Dark theme'}>
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <Link to="/profile" className="ml-1 w-8 h-8 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300 flex items-center justify-center hover:ring-2 hover:ring-violet-300 dark:hover:ring-violet-500/50 transition" aria-label="Profile">
              <User className="w-4 h-4" />
            </Link>
          </div>
        </header>

        {/* Messages (the ONLY scrolling region) */}
        <main ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
            {/* Conversation loading */}
            {isLoadingChat && (
              <div className="flex items-center justify-center gap-2 py-24 text-sm text-slate-500 dark:text-slate-400" aria-live="polite">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading conversation…
              </div>
            )}

            {/* Save failure notice (chat keeps working) */}
            {saveError && (
              <div role="status" className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                <CloudOff className="w-4 h-4 mt-0.5 flex-shrink-0" /> {saveError}
              </div>
            )}

            {/* Welcome / empty state */}
            {!hasConversation && !isLoadingChat && (
              <section className="pt-6 sm:pt-12 text-center">
                <div className="mx-auto w-12 h-12 rounded-2xl bg-violet-100 dark:bg-violet-500/15 flex items-center justify-center">
                  <Activity className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                </div>
                <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">How can I help you today?</h1>
                <p className="mt-2 text-[15px] text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  Ask about symptoms, conditions or medications. Answers include confidence, sources and an explanation.
                </p>
                <div className="mt-8 grid sm:grid-cols-2 gap-3 text-left">
                  {SUGGESTED_PROMPTS.map(({ icon: Icon, text }) => (
                    <button
                      key={text}
                      onClick={() => handleSendMessage(text)}
                      disabled={isLoading}
                      className="group flex items-start gap-3 p-4 rounded-xl border border-slate-200 bg-white hover:border-violet-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-violet-500/50 transition"
                    >
                      <Icon className="w-5 h-5 mt-0.5 flex-shrink-0 text-violet-500 dark:text-violet-400" />
                      <span className="text-left text-sm text-slate-700 group-hover:text-slate-900 dark:text-slate-300 dark:group-hover:text-white">{text}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {!isLoadingChat && visibleMessages.map((message) =>
              message.type === 'user' ? (
                // ---- User message ----
                <div key={message.id} className="flex justify-end message-bubble">
                  <div className="max-w-[85%] sm:max-w-[75%]">
                    <div className="rounded-2xl rounded-br-md px-4 py-2.5 bg-violet-600 text-white shadow-sm">
                      <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
                    </div>
                    <p className="mt-1 text-right text-[11px] text-slate-400 dark:text-slate-500">{formatTime(message.timestamp)}</p>
                  </div>
                </div>
              ) : (
                // ---- Bot message ----
                <div key={message.id} className="flex gap-3 message-bubble">
                  <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${
                    message.isError ? 'bg-red-100 dark:bg-red-500/15' : 'bg-violet-100 dark:bg-violet-500/15'
                  }`}>
                    {message.isError
                      ? <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                      : <Activity className="w-4 h-4 text-violet-600 dark:text-violet-400" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    {message.isError ? (
                      <div className="rounded-2xl rounded-tl-md border border-red-200 bg-red-50 px-4 py-3 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                        <p className="text-[15px] leading-relaxed">{message.content}</p>
                        <button
                          onClick={retryLast}
                          disabled={isLoading}
                          className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-red-700 hover:text-red-900 dark:text-red-300 dark:hover:text-red-100 disabled:opacity-50"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Try again
                        </button>
                      </div>
                    ) : (
                      <div className="rounded-2xl rounded-tl-md border border-slate-200 bg-white px-4 sm:px-5 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <ResponseCard content={message.content} meta={message.meta} />
                      </div>
                    )}

                    {/* Actions row */}
                    <div className="mt-1.5 flex items-center gap-1 text-slate-400 dark:text-slate-500">
                      <span className="text-[11px] mr-1">{formatTime(message.timestamp)}</span>
                      {!message.isError && (
                        <>
                          <button
                            onClick={() => copyMessage(message.id, message.content)}
                            className="p-1.5 rounded-md hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
                            title="Copy" aria-label="Copy response"
                          >
                            {copiedId === message.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          {/* Feedback is local-only for now (no backend endpoint yet) */}
                          <button
                            onClick={() => setFeedback(f => ({ ...f, [message.id]: 'up' }))}
                            aria-pressed={feedback[message.id] === 'up'}
                            className={`p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${feedback[message.id] === 'up' ? 'text-emerald-600 dark:text-emerald-400' : 'hover:text-slate-700 dark:hover:text-slate-200'}`}
                            title="Helpful" aria-label="Helpful"
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setFeedback(f => ({ ...f, [message.id]: 'down' }))}
                            aria-pressed={feedback[message.id] === 'down'}
                            className={`p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${feedback[message.id] === 'down' ? 'text-red-600 dark:text-red-400' : 'hover:text-slate-700 dark:hover:text-slate-200'}`}
                            title="Not helpful" aria-label="Not helpful"
                          >
                            <ThumbsDown className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            )}

            {/* Loading */}
            {isLoading && (
              <div className="flex gap-3" aria-live="polite">
                <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center bg-violet-100 dark:bg-violet-500/15">
                  <Activity className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                </div>
                <div className="rounded-2xl rounded-tl-md border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex items-center gap-3">
                  <span className="flex gap-1" aria-hidden>
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse [animation-delay:300ms]" />
                  </span>
                  <span className="text-sm text-slate-600 dark:text-slate-300">{LOADING_STEPS[loadingStep]}</span>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Composer (fixed at bottom) */}
        <footer className="flex-shrink-0 border-t border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 px-3 sm:px-6 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-2 rounded-2xl border border-slate-300 bg-white px-2 py-2 shadow-sm focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-500/20 dark:border-slate-700 dark:bg-slate-800 dark:focus-within:border-violet-500 transition">
              <textarea
                ref={textareaRef}
                aria-label="Message"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Describe symptoms or ask a question…"
                className="chat-input flex-1 resize-none bg-transparent px-2 py-2 text-[15px] leading-6 text-slate-900 placeholder-slate-400 focus:outline-none dark:text-slate-100 dark:placeholder-slate-500"
                rows={1}
                disabled={isLoading}
              />
              {/* Voice placeholder — voice backend arrives in Phase 7 */}
              <button
                disabled
                className="p-2.5 rounded-xl text-slate-300 dark:text-slate-600 cursor-not-allowed"
                title="Voice input — coming soon"
                aria-label="Voice input (coming soon)"
              >
                <Mic className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleSendMessage()}
                aria-label="Send message"
                disabled={!inputMessage.trim() || isLoading}
                className="p-2.5 rounded-xl bg-violet-600 text-white hover:bg-violet-700 disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-slate-700 dark:disabled:text-slate-500 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            <p className="mt-2 text-[11px] text-center text-slate-400 dark:text-slate-500">
              CURA-X can make mistakes. Always consult a healthcare professional for medical advice.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
};

// One conversation row: select, inline rename, inline delete confirmation.
// (Previous plain <button> row is preserved in project/legacy/Chatbot.v1-dark.tsx history.)
const HistoryItem: React.FC<{
  chat: ChatHistoryItem;
  active: boolean;
  isBusy: boolean;
  onSelect: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
}> = ({ chat, active, isBusy, onSelect, onRename, onDelete }) => {
  const [mode, setMode] = useState<'view' | 'rename' | 'confirm'>('view');
  const [draft, setDraft] = useState(chat.title);
  const inputRef = useRef<HTMLInputElement>(null);
  const deleteBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (mode === 'rename') { inputRef.current?.focus(); inputRef.current?.select(); }
    if (mode === 'confirm') deleteBtnRef.current?.focus();
  }, [mode]);

  const commitRename = () => {
    if (mode !== 'rename') return;
    setMode('view');
    if (draft.trim() && draft.trim() !== chat.title) onRename(draft);
  };

  const rowBase = 'rounded-lg transition-colors';
  const actionBtn =
    'p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-white dark:hover:text-slate-200 dark:hover:bg-slate-700 transition-colors';

  if (mode === 'rename') {
    return (
      <li className={`${rowBase} px-2 py-1.5 bg-slate-100 dark:bg-slate-800`}>
        <label htmlFor={`rename-${chat.id}`} className="sr-only">Rename conversation</label>
        <input
          id={`rename-${chat.id}`}
          ref={inputRef}
          value={draft}
          maxLength={80}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); commitRename(); }
            if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setDraft(chat.title); setMode('view'); }
          }}
          className="w-full h-8 px-2 rounded-md border border-violet-400 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 dark:bg-slate-950 dark:text-slate-100 dark:border-violet-500"
        />
        <p className="mt-1 px-0.5 text-[11px] text-slate-400 dark:text-slate-500">Enter to save · Esc to cancel</p>
      </li>
    );
  }

  if (mode === 'confirm') {
    return (
      <li
        className={`${rowBase} px-3 py-2.5 bg-red-50 border border-red-200 dark:bg-red-500/10 dark:border-red-500/30`}
        onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); setMode('view'); } }}
      >
        <p className="text-sm font-medium text-red-800 dark:text-red-200">Delete this chat?</p>
        <p className="text-xs text-red-700/80 dark:text-red-300/80 truncate" title={chat.title}>{chat.title}</p>
        <div className="mt-2 flex gap-2">
          <button
            onClick={() => setMode('view')}
            className="flex-1 h-8 rounded-md border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            ref={deleteBtnRef}
            onClick={() => { setMode('view'); onDelete(); }}
            className="flex-1 h-8 rounded-md bg-red-600 text-xs font-medium text-white hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </li>
    );
  }

  const locked = isBusy && active; // can't rename/delete the chat that's mid-reply
  return (
    <li
      className={`group relative ${rowBase} ${
        active
          ? 'bg-violet-50 text-violet-900 dark:bg-violet-500/15 dark:text-white'
          : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
      }`}
    >
      <button
        onClick={onSelect}
        disabled={isBusy && !active}
        title={chat.title}
        aria-current={active ? 'page' : undefined}
        className="w-full text-left pl-3 pr-16 py-2.5 rounded-lg flex items-start gap-2.5 disabled:cursor-not-allowed"
      >
        <MessageSquare className={`w-4 h-4 mt-0.5 flex-shrink-0 ${active ? 'text-violet-600 dark:text-violet-400' : 'text-slate-400'}`} />
        <span className="min-w-0">
          <span className="block text-sm font-medium truncate">{chat.title}</span>
          <span className="block text-xs text-slate-400 dark:text-slate-500">{chat.time}</span>
        </span>
      </button>
      {/* Row actions: shown on hover / keyboard focus; always visible on touch screens */}
      {!locked && (
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity">
          <button
            onClick={() => { setDraft(chat.title); setMode('rename'); }}
            className={actionBtn}
            aria-label={`Rename “${chat.title}”`}
            title="Rename"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setMode('confirm')}
            className={`${actionBtn} hover:!text-red-600 dark:hover:!text-red-400`}
            aria-label={`Delete “${chat.title}”`}
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </li>
  );
};

const SidebarContent: React.FC<SidebarContentProps> = ({
  isMemoryOn,
  setIsMemoryOn,
  chatHistory,
  onClose,
  onNewChat,
  activeChatId,
  onSelectChat,
  isLoadingHistory,
  isBusy,
  onRenameChat,
  onDeleteChat,
}) => {
  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex-shrink-0 p-4 space-y-3">
        <div className="flex items-center justify-between h-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Conversations</h2>
          {onClose && (
            <button onClick={onClose} className={`${iconBtn} -mr-2 lg:hidden`} aria-label="Close chat history">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        <button
          onClick={onNewChat}
          disabled={isBusy}
          className="w-full h-10 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium flex items-center justify-center gap-2 shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          New chat
        </button>
      </div>

      {/* History (scrolls independently) */}
      <nav className="flex-1 min-h-0 overflow-y-auto px-3 pb-3" aria-label="Previous chats">
        {isLoadingHistory ? (
          <ul className="space-y-1" aria-label="Loading conversations">
            {[0, 1, 2].map(i => (
              <li key={i} className="px-3 py-2.5 rounded-lg">
                <div className="h-3.5 w-3/4 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
                <div className="mt-2 h-2.5 w-1/4 rounded bg-slate-100 dark:bg-slate-800/60 animate-pulse" />
              </li>
            ))}
          </ul>
        ) : chatHistory.length === 0 ? (
          <div className="mt-6 px-3 text-center">
            <MessageSquare className="w-6 h-6 mx-auto text-slate-300 dark:text-slate-600" />
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">No previous chats yet</p>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Your conversations are saved and will appear here.</p>
          </div>
        ) : (
          <ul className="space-y-1">
            {chatHistory.map((chat) => (
              <HistoryItem
                key={chat.id}
                chat={chat}
                active={chat.id === activeChatId}
                isBusy={!!isBusy}
                onSelect={() => onSelectChat?.(chat.id)}
                onRename={(t) => onRenameChat?.(chat.id, t)}
                onDelete={() => onDeleteChat?.(chat.id)}
              />
            ))}
          </ul>
        )}
      </nav>

      {/* Footer: memory + settings */}
      <div className="flex-shrink-0 border-t border-slate-200 dark:border-slate-800 p-3 space-y-1">
        <div className="flex items-center justify-between px-2 py-2">
          <div className="flex items-center gap-2.5">
            <Brain className="w-4 h-4 text-violet-500 dark:text-violet-400" />
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Memory</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{isMemoryOn ? 'Uses earlier messages' : 'Each message stands alone'}</p>
            </div>
          </div>
          <button
            role="switch"
            aria-checked={isMemoryOn}
            aria-label="Conversation memory"
            onClick={() => setIsMemoryOn(!isMemoryOn)}
            className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors ${
              isMemoryOn ? 'bg-violet-600' : 'bg-slate-300 dark:bg-slate-600'
            }`}
          >
            <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${isMemoryOn ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
          </button>
        </div>
        <button className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white transition-colors">
          <Settings className="w-4 h-4" />
          Settings
        </button>
      </div>
    </div>
  );
};

export default Chatbot;
