# Frontend Changes Required

## Current Frontend Summary

The `Chatbot.tsx` page is the only page that interacts with AI. It currently:
- Renders a hardcoded initial bot greeting
- Sends a message to `/ai/chat` and renders `data.reply` as plain text
- Shows a spinner during loading
- Has a sidebar with hardcoded static chat history
- Has a non-functional "New Chat" button
- Has a memory toggle (sends param, ignored by backend)
- Has an EN/ES language selector (sends param, ignored by backend)
- Has copy / thumbs up / thumbs down buttons (copy works; thumbs are no-ops)
- Never calls any of the chat persistence API routes

---

## New Components to Create

### `src/components/ConfidenceBadge.tsx`

```
Props: { score: number }
Renders: colored pill badge

  ≥ 0.75  → green  "High confidence"
  0.5–0.74 → yellow "Moderate confidence"
  < 0.5   → red    "Low confidence"

Placement: bot message footer, next to timestamp
```

### `src/components/EvidenceAccordion.tsx`

```
Props: { evidence: Evidence[] }
  Evidence: { source, title, excerpt, relevance_score, url? }

Renders: collapsible "Sources" section

  [Sources (3) ▼]
    ├── MedlinePlus — Hypertension
    │   "Blood pressure is the force of blood pushing..."
    │   Relevance: 89%
    ├── WHO Guidelines — Cardiovascular
    │   "...
    └── StatPearls — Hypertension Management
        "...

Placement: below bot message bubble, collapsible
```

### `src/components/ExplanationPanel.tsx`

```
Props: { explanation: string }

Renders: collapsible "Why this answer?" section

  [Why this answer? ▼]
    Step 1: The symptoms described are consistent with...
    Step 2: MedlinePlus confirms that...
    Step 3: Therefore the most likely explanation is...

Placement: below EvidenceAccordion
```

### `src/components/EmergencyBanner.tsx`

```
Props: { alertMessage: string, onDismiss: () => void }

Renders: full-width red alert banner

  ┌──────────────────────────────────────────────────┐
  │ ⚠️  MEDICAL EMERGENCY DETECTED                   │
  │ Call 911 or your local emergency number.         │
  │ Do not wait for AI guidance in an emergency. [✕] │
  └──────────────────────────────────────────────────┘

Placement: above the bot message bubble, not dismissable by default
```

### `src/components/HallucinationWarning.tsx`

```
Props: { flag: boolean }

Renders (only if flag=true): yellow inline warning

  ⚠️ This response contains claims not fully supported by
     retrieved medical sources. Please verify with a
     healthcare professional.

Placement: inside bot message footer
```

---

## Changes to `src/pages/Chatbot.tsx`

### Message type extension

```typescript
// Current:
interface Message {
  id: number;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
}

// Target — add new fields:
interface Message {
  id: number;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  confidence?: number;
  explanation?: string;
  evidence?: Evidence[];
  is_emergency?: boolean;
  alert_message?: string;
  hallucination_flag?: boolean;
  language?: string;
}
```

### `handleSendMessage` — updated API call

```typescript
// Current: calls /ai/chat directly
// Target: calls /api/chat (through Node, with auth)

const response = await fetch('/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('authToken')}`
  },
  body: JSON.stringify({
    message: currentInput,
    language: selectedLanguage,
    memory: isMemoryOn,
    sessionId: currentSessionId
  })
})

const data: ChatResponse = await response.json()

// Emergency banner: shown at top of message
// Confidence badge: shown in footer
// Evidence accordion: collapsible below message
// Explanation panel: collapsible below evidence
// Hallucination warning: inline warning if flag set
```

### Chat history sidebar — wire to API

```typescript
// Current: hardcoded static array
const chatHistory: ChatHistoryItem[] = [
  { id: 1, title: 'Chest pain symptoms', time: '2 hours ago' },
  ...
]

// Target: loaded from API on mount
const [chatHistory, setChatHistory] = useState<ChatSession[]>([])

useEffect(() => {
  chatAPI.getChats().then(res => setChatHistory(res.chats))
}, [])
```

### New Chat button — wire to API

```typescript
// Current: no-op
// Target:
const handleNewChat = async () => {
  const res = await chatAPI.createChat()
  setCurrentSessionId(res.chat.sessionId)
  setMessages([initialBotMessage])
  setChatHistory(prev => [res.chat, ...prev])
}
```

### Voice input — mic button

```typescript
// Add near send button:
<button
  onClick={toggleRecording}
  className={`p-3 rounded-lg ${isRecording ? 'bg-red-600 animate-pulse' : 'bg-slate-600'}`}
>
  <Mic className="w-5 h-5 text-white" />
</button>
```

### Voice output — speaker button per message

```typescript
// Add to each bot message footer:
<button
  onClick={() => speak(message.content, message.language)}
  className="p-1 text-gray-400 hover:text-violet-400 transition-colors"
  title="Play audio"
>
  <Volume2 className="w-4 h-4" />
</button>
```

### Language selector — expanded + auto-detect

```typescript
const languages: Language[] = [
  { code: 'auto', name: 'Auto-detect' },
  { code: 'EN', name: 'English' },
  { code: 'ES', name: 'Español' },
  { code: 'HI', name: 'Hindi' },
  { code: 'TE', name: 'Telugu' },
  { code: 'FR', name: 'Français' },
  { code: 'AR', name: 'العربية' },
]
```

### Multi-step loading indicator

```typescript
// Current: "Thinking..." spinner
// Target: rotating status messages

const LOADING_STEPS = [
  'Detecting language...',
  'Checking for emergencies...',
  'Retrieving medical knowledge...',
  'Generating response...',
  'Verifying accuracy...'
]
```

---

## Changes to `src/types/api.ts`

```typescript
// Add to ChatResponse:
export interface Evidence {
  source: string
  title?: string
  excerpt: string
  relevance_score: number
  url?: string
}

export interface ChatResponse {
  reply: string
  confidence?: number
  explanation?: string
  evidence?: Evidence[]
  is_emergency?: boolean
  alert_message?: string | null
  language?: string
  hallucination_flag?: boolean
  sources?: string[]
}
```

---

## Changes to `src/services/api.ts`

- Replace hardcoded `http://localhost:5000/api` with `import.meta.env.VITE_API_URL || 'http://localhost:5000/api'`
- Update the chat send call to go through Node (`/api/chat`) not directly to Python (`/ai/chat`)

---

## Pages That Need No Changes

| Page | Status |
|---|---|
| `Login.tsx` | No changes needed |
| `Signup.tsx` | No changes needed |
| `Profile.tsx` | No changes needed |
| `Home.tsx` | No changes needed |
| `Features.tsx` | May update with CURA-X feature descriptions |
| `About.tsx` | May update with CURA-X description |
| `Contact.tsx` | No changes needed |
| `UseCases.tsx` | May update with new use cases |
| `Navbar.tsx` | No changes needed |

---

## Summary of New UI Elements

| Element | Component | Trigger |
|---|---|---|
| Confidence badge | `ConfidenceBadge.tsx` | Every bot response |
| Sources accordion | `EvidenceAccordion.tsx` | Every bot response (if evidence available) |
| Explanation panel | `ExplanationPanel.tsx` | Every bot response (if explanation available) |
| Emergency banner | `EmergencyBanner.tsx` | Only if `is_emergency=true` |
| Hallucination warning | `HallucinationWarning.tsx` | Only if `hallucination_flag=true` |
| Mic button | inline in `Chatbot.tsx` | Always visible in input area |
| Speaker button | inline per bot message | Every bot response |
| Multi-step loader | inline in `Chatbot.tsx` | During loading |
