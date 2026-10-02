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
  History,
  Menu,
  X,
  Mic,
  AlertCircle,
} from 'lucide-react';

// Import types from separate file
import { Message, ChatResponse, Language, ChatHistoryItem } from '../types/api';
import { ResponseCard } from '../components/chat/ResponseCard';
import { buildResponseMeta } from '../services/responseMeta';

// Component-specific interface (only used in this file)
interface SidebarContentProps {
  isMemoryOn: boolean;
  setIsMemoryOn: (value: boolean) => void;
  chatHistory: ChatHistoryItem[];
  onClose?: () => void;
  onNewChat?: () => void;
  activeChatId?: number | null;
  onSelectChat?: (id: number) => void;
}

// Local-only session store for the history sidebar (Phase 9 will persist to MongoDB).
interface LocalSession extends ChatHistoryItem {
  messages: Message[];
}

const GREETING = "Hello! I'm Cura, your AI healthcare assistant. Feel free to ask about your symptoms, conditions, medications, or any health-related questions. How can I help you today?";

const SUGGESTED_PROMPTS = [
  "I have a cold and sore throat — home remedies?",
  "What is chronic arthritis?",
  "I have a fever since yesterday, what should I do?",
  "Can I take ibuprofen with paracetamol?",
];

// Shown while waiting — mirrors the planned CURA-X pipeline stages.
const LOADING_STEPS = [
  'Understanding your question…',
  'Checking medical knowledge…',
  'Preparing a safe answer…',
];

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

const Chatbot: React.FC = () => {
  // ---- OLD inline greeting state (replaced by makeGreeting()) ----
  // const [messages, setMessages] = useState<Message[]>([{ id: 1, type: 'bot', content: "Hello! I'm Cura, ...", timestamp: new Date() }]);
  const [messages, setMessages] = useState<Message[]>([makeGreeting()]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isMemoryOn, setIsMemoryOn] = useState<boolean>(true);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('EN');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<number>(0);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<Record<number, 'up' | 'down'>>({});
  const [sessions, setSessions] = useState<LocalSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ---- OLD language list ----
  // const languages: Language[] = [{ code: 'EN', name: 'English' }, { code: 'ES', name: 'Español' }];
  // UI only for now — multilingual processing arrives in Phase 6. Code is sent to the backend already.
  const languages: Language[] = [
    { code: 'EN', name: 'English' },
    { code: 'HI', name: 'हिन्दी' },
    { code: 'TE', name: 'తెలుగు' },
    { code: 'TA', name: 'தமிழ்' },
    { code: 'ES', name: 'Español' },
  ];

  // ---- OLD static history list (kept for reference) ----
  // const chatHistory: ChatHistoryItem[] = [
  //   { id: 1, title: 'Chest pain symptoms', time: '2 hours ago' },
  //   { id: 2, title: 'Diabetes management', time: '1 day ago' },
  //   { id: 3, title: 'Medication interactions', time: '3 days ago' },
  //   { id: 4, title: 'Blood pressure readings', time: '1 week ago' },
  //   { id: 5, title: 'Exercise recommendations', time: '2 weeks ago' }
  // ];
  const chatHistory: ChatHistoryItem[] = sessions.map(({ id, title, time }) => ({ id, title, time }));

  // Auto-scroll to newest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Cycle loading-stage text while waiting
  useEffect(() => {
    if (!isLoading) { setLoadingStep(0); return; }
    const t = setInterval(() => setLoadingStep(s => Math.min(s + 1, LOADING_STEPS.length - 1)), 1200);
    return () => clearInterval(t);
  }, [isLoading]);

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [inputMessage]);

  const hasConversation = messages.some(m => m.type === 'user');

  // Save the current conversation into the local sidebar list
  const saveCurrentSession = (msgs: Message[]) => {
    const firstUser = msgs.find(m => m.type === 'user');
    if (!firstUser) return;
    const id = activeChatId ?? Date.now();
    const title = firstUser.content.length > 40 ? firstUser.content.slice(0, 40) + '…' : firstUser.content;
    setSessions(prev => {
      const rest = prev.filter(s => s.id !== id);
      return [{ id, title, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), messages: msgs }, ...rest];
    });
    if (activeChatId === null) setActiveChatId(id);
  };

  const handleNewChat = () => {
    saveCurrentSession(messages);
    setMessages([makeGreeting()]);
    setActiveChatId(null);
    setIsSidebarOpen(false);
  };

  const handleSelectChat = (id: number) => {
    const s = sessions.find(x => x.id === id);
    if (!s) return;
    saveCurrentSession(messages);
    setMessages(s.messages);
    setActiveChatId(id);
    setIsSidebarOpen(false);
  };

  // `base` lets retry send against a trimmed list without stale-state issues.
  const handleSendMessage = async (override?: string, base: Message[] = messages): Promise<void> => {
    const text = (override ?? inputMessage).trim();
    if (!text || isLoading) return;

    // Unique ids (length-based ids could collide after retry / session switch)
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

    try {
      // PHASE 1: Route changed from /ai/chat (direct to Python) → /api/chat (through Node).
      // Node verifies JWT then forwards to Python /ai/chat → Groq.
      // Old direct call preserved as comment:
      // const response = await fetch('/ai/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, ... })
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

      const botResponse: Message = {
        id: Date.now() + 1,
        type: 'bot',
        content: data.reply || "I apologize, but I couldn't generate a response. Please try again.",
        timestamp: new Date(),
        // Structured metadata — real backend fields when present, preview/mock otherwise
        meta: data.reply ? buildResponseMeta(data, selectedLanguage) : undefined,
        isError: !data.reply,
      };
      
      setMessages(prev => [...prev, botResponse]);

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

      setMessages(prev => [...prev, errorMessage]);
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

  // ---- OLD copy (no feedback) ----
  // const copyMessage = (content: string): void => { navigator.clipboard.writeText(content); };
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
    handleSendMessage(lastUser.content, messages.slice(0, idx));
  };

  return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div 
            className="fixed inset-0 bg-black bg-opacity-50" 
            onClick={() => setIsSidebarOpen(false)} 
          />
          <div className="fixed left-0 top-0 bottom-0 w-80 bg-slate-800 border-r border-slate-700 z-50">
            <SidebarContent
              isMemoryOn={isMemoryOn}
              setIsMemoryOn={setIsMemoryOn}
              chatHistory={chatHistory}
              onClose={() => setIsSidebarOpen(false)}
              onNewChat={handleNewChat}
              activeChatId={activeChatId}
              onSelectChat={handleSelectChat}
            />
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-80 bg-slate-800 border-r border-slate-700">
        <SidebarContent
          isMemoryOn={isMemoryOn}
          setIsMemoryOn={setIsMemoryOn}
          chatHistory={chatHistory}
          onNewChat={handleNewChat}
          activeChatId={activeChatId}
          onSelectChat={handleSelectChat}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="bg-slate-800 border-b border-slate-700 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden p-2 text-gray-400 hover:text-white transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
              <Link to="/" className="flex items-center space-x-2 group">
                <div className="bg-violet-600 p-2 rounded-lg group-hover:bg-violet-500 transition-colors">
                  <Activity className="h-6 w-6 text-white" />
                </div>
                <span className="text-xl font-bold text-white hidden sm:block">Cura Chat</span>
              </Link>
            </div>

            <div className="flex items-center space-x-4">
              {/* Language Selector */}
              <div className="flex items-center gap-1.5 bg-slate-700 border border-slate-600 rounded-lg pl-2.5 focus-within:ring-2 focus-within:ring-violet-500">
                <Globe className="w-4 h-4 text-gray-400" aria-hidden />
                <select
                  aria-label="Response language"
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="bg-transparent text-white py-2 pr-3 text-sm focus:outline-none"
                >
                  {languages.map((lang) => (
                    <option key={lang.code} value={lang.code} className="bg-slate-800">
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Profile */}
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-violet-600 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-3xl ${message.type === 'user' ? 'order-2' : 'order-1'}`}>
                <div className={`flex items-start space-x-3 ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.type === 'user' ? 'bg-gray-600' : 'bg-violet-600'
                  }`}>
                    {message.type === 'user' ? (
                      <User className="w-4 h-4 text-white" />
                    ) : (
                      <Activity className="w-4 h-4 text-white" />
                    )}
                  </div>

                  {/* Message Content */}
                  <div className={`rounded-2xl px-4 py-3 ${
                    message.type === 'user'
                      ? 'bg-violet-600 text-white'
                      : message.isError
                        ? 'bg-red-950/40 border border-red-800/50 text-red-200'
                        : 'bg-slate-700 text-gray-100'
                  }`}>
                    {/* ---- OLD plain-text body ---- */}
                    {/* <p className="leading-relaxed">{message.content}</p> */}
                    {message.type === 'bot' && !message.isError ? (
                      <ResponseCard content={message.content} meta={message.meta} />
                    ) : message.isError ? (
                      <div className="flex gap-2 items-start">
                        <AlertCircle className="w-4 h-4 mt-1 flex-shrink-0" />
                        <div>
                          <p className="leading-relaxed">{message.content}</p>
                          <button onClick={retryLast} disabled={isLoading} className="mt-2 text-sm underline hover:text-white disabled:opacity-50">
                            Try again
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="leading-relaxed whitespace-pre-wrap">{message.content}</p>
                    )}

                    {message.type === 'bot' && !message.isError && (
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-600">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => copyMessage(message.id, message.content)}
                            className="p-1 text-gray-400 hover:text-white transition-colors"
                            title="Copy message"
                            aria-label="Copy message"
                          >
                            {copiedId === message.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                          </button>
                          {/* Feedback is local-only for now (no backend endpoint yet) */}
                          <button
                            onClick={() => setFeedback(f => ({ ...f, [message.id]: 'up' }))}
                            className={`p-1 transition-colors ${feedback[message.id] === 'up' ? 'text-green-400' : 'text-gray-400 hover:text-green-400'}`}
                            title="Good response" aria-label="Good response"
                          >
                            <ThumbsUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setFeedback(f => ({ ...f, [message.id]: 'down' }))}
                            className={`p-1 transition-colors ${feedback[message.id] === 'down' ? 'text-red-400' : 'text-gray-400 hover:text-red-400'}`}
                            title="Poor response" aria-label="Poor response"
                          >
                            <ThumbsDown className="w-4 h-4" />
                          </button>
                        </div>
                        <span className="text-xs text-gray-500">
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-3xl">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-violet-600">
                    <Activity className="w-4 h-4 text-white" />
                  </div>
                  <div className="rounded-2xl px-4 py-3 bg-slate-700 text-gray-100">
                    {/* ---- OLD: spinner + "Thinking..." ---- */}
                    <div className="flex items-center space-x-3" aria-live="polite">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce [animation-delay:-0.3s]" />
                        <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce [animation-delay:-0.15s]" />
                        <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" />
                      </div>
                      <span className="text-sm text-gray-300">{LOADING_STEPS[loadingStep]}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Suggested prompts for a fresh chat */}
          {!hasConversation && !isLoading && (
            <div className="max-w-3xl ml-11">
              <p className="text-sm text-gray-400 mb-2">Try asking:</p>
              <div className="grid sm:grid-cols-2 gap-2">
                {SUGGESTED_PROMPTS.map(p => (
                  <button
                    key={p}
                    onClick={() => handleSendMessage(p)}
                    className="text-left text-sm px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-gray-300 hover:border-violet-500 hover:text-white transition-colors"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-slate-700 bg-slate-800 p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-end space-x-4">
              <div className="flex-1">
                <textarea
                  ref={textareaRef}
                  aria-label="Message"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Describe your symptoms or ask a health question..."
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 resize-none"
                  rows={1}
                  style={{ minHeight: '44px', maxHeight: '120px' }}
                  disabled={isLoading}
                />
              </div>
              {/* Voice placeholder — voice backend arrives in Phase 7 */}
              <button
                disabled
                className="bg-slate-700 text-gray-500 p-3 rounded-lg cursor-not-allowed"
                title="Voice input coming soon"
                aria-label="Voice input (coming soon)"
              >
                <Mic className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleSendMessage()}
                aria-label="Send message"
                disabled={!inputMessage.trim() || isLoading}
                className="bg-violet-600 hover:bg-violet-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white p-3 rounded-lg transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            <div className="mt-2 text-xs text-gray-500 text-center">
              CURA AI can make mistakes. Please consult healthcare professionals for medical advice.
            </div>
          </div>
        </div>
      </div>
    </div>
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
}) => {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Chat History</h2>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-white transition-colors lg:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        
        <button onClick={onNewChat} className="w-full bg-violet-600 hover:bg-violet-700 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>New Chat</span>
        </button>
      </div>

      {/* Memory Toggle */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Brain className="w-5 h-5 text-violet-400" />
            <span className="text-white font-medium">Memory</span>
          </div>
          <button
            onClick={() => setIsMemoryOn(!isMemoryOn)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isMemoryOn ? 'bg-violet-600' : 'bg-slate-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                isMemoryOn ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          {isMemoryOn ? 'Cura remembers your conversations' : 'Each chat starts fresh'}
        </p>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-2">
          {chatHistory.length === 0 && (
            <p className="text-sm text-gray-500 text-center mt-6 px-2">
              No previous chats yet. Your conversations from this session will appear here.
            </p>
          )}
          {chatHistory.map((chat) => (
            <button
              key={chat.id}
              onClick={() => onSelectChat?.(chat.id)}
              className={`w-full text-left p-3 rounded-lg transition-colors border group ${
                chat.id === activeChatId
                  ? 'bg-slate-700 border-violet-500/60'
                  : 'bg-slate-700/50 hover:bg-slate-700 border-transparent hover:border-slate-600'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate group-hover:text-violet-300 transition-colors">
                    {chat.title}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{chat.time}</p>
                </div>
                <History className="w-4 h-4 text-gray-500 ml-2 flex-shrink-0" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Settings */}
      <div className="p-4 border-t border-slate-700">
        <button className="w-full flex items-center space-x-2 text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-slate-700">
          <Settings className="w-5 h-5" />
          <span>Settings</span>
        </button>
      </div>
    </div>
  );
};

export default Chatbot;
