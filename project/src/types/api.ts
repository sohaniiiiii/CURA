// src/types/api.ts

export interface Message {
  id: number;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  // Structured response metadata (CURA-X target design).
  // Optional so plain messages (greeting, errors) still render.
  meta?: ResponseMeta;
  isError?: boolean;
}

export interface EvidenceSource {
  title: string;
  publisher: string;
  url?: string;
  snippet?: string;
}

export interface EmergencyInfo {
  level: 'warning' | 'critical';
  message: string;
  action: string;
}

// Shape the backend will return in later phases.
// `isMock` marks values generated client-side until the real pipeline exists.
export interface ResponseMeta {
  confidence: number;              // 0..1
  sources: EvidenceSource[];
  explanation: string[];           // "Why this answer?" bullet points
  emergency?: EmergencyInfo | null;
  language?: string;
  isMock: boolean;
}

export interface ChatRequest {
  message: string;
  language?: string;
  memory?: boolean;
}

export interface ChatResponse {
  reply: string;
  confidence?: number;
  // Future fields (Phase 2–5). Frontend uses them when present, mocks otherwise.
  sources?: EvidenceSource[];
  explanation?: string[];
  emergency?: EmergencyInfo | null;
  language?: string;
  // "smalltalk" = greeting / thanks etc. — shown without the medical answer card
  type?: 'medical' | 'smalltalk';
}

export interface Language {
  code: string;
  name: string;
}

// OLD: { id: number; title: string; time: string } — local-only ids.
// id is now the MongoDB chat sessionId.
export interface ChatHistoryItem {
  id: string;
  title: string;
  time: string;
  updatedAt?: string;
}
