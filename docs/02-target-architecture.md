# Target Architecture — CURA-X

## System Identity

**CURA-X** — a trustworthy multilingual medical assistant combining Precision RAG with confidence-aware clinical reasoning to deliver accurate, explainable, and evidence-based medical responses.

## High-Level Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Tailwind + Web Speech API |
| Node backend | Express 5 + Mongoose + JWT (unchanged) |
| AI service | Python FastAPI — pipeline orchestrator |
| LLM | Groq API (LLaMA-3 70B or Mixtral 8x7B) |
| Retrieval | ChromaDB (local) + sentence-transformers embeddings |
| Translation | deep-translator + langdetect |
| Database | MongoDB (enriched message schema) |
| Voice | Browser-native Web Speech API (STT + TTS) |

## Complete Request Flow

```
┌─────────────────────────────────────────────────────────┐
│                       USER                               │
│  Text input  ──or──  Voice (mic) → Web Speech API STT   │
│  Language selector (or auto-detected)                    │
└─────────────────────┬───────────────────────────────────┘
                       │  POST /api/chat
                       │  { message, language, memory, sessionId }
                       ▼
┌─────────────────────────────────────────────────────────┐
│              REACT FRONTEND (port 5173)                  │
│  Chatbot.tsx — sends request, renders:                   │
│   • reply text                                           │
│   • ConfidenceBadge (green/yellow/red)                   │
│   • EvidenceAccordion (sources + excerpts)               │
│   • ExplanationPanel (chain-of-thought)                  │
│   • EmergencyBanner (red alert if is_emergency)          │
│   • HallucinationWarning (yellow if flag set)            │
│   • Speaker button (TTS playback)                        │
└─────────────────────┬───────────────────────────────────┘
                       │  (Vite proxy → localhost:5000)
                       ▼
┌─────────────────────────────────────────────────────────┐
│           NODE/EXPRESS BACKEND (port 5000)               │
│  1. JWT auth middleware                                  │
│  2. Forward to Python AI service: POST /chat             │
│  3. On response: save enriched message to MongoDB        │
│  4. Return response to frontend                          │
└─────────────────────┬───────────────────────────────────┘
                       │  POST http://localhost:8000/chat
                       ▼
┌─────────────────────────────────────────────────────────┐
│         PYTHON / FASTAPI AI SERVICE (port 8000)          │
│                                                          │
│  STAGE 1 — LANGUAGE PROCESSING                           │
│  ├─ langdetect.detect(query) → detected_lang             │
│  ├─ if lang != "en": translate to English                │
│  └─ normalize: strip noise, lowercase medical terms      │
│                                                          │
│  STAGE 2 — EMERGENCY PRE-SCREEN                          │
│  ├─ keyword matcher (chest pain, stroke, overdose, etc.) │
│  ├─ if hit → Groq binary classifier: "Is this emergency?"│
│  └─ set is_emergency, alert_message                      │
│                                                          │
│  STAGE 3 — KNOWLEDGE RETRIEVAL (Precision RAG)           │
│  ├─ embed normalized query (sentence-transformers)       │
│  ├─ ChromaDB cosine search → top-10 chunks               │
│  ├─ rerank → top-5 chunks                                │
│  └─ return [{text, source, score}]                       │
│                                                          │
│  STAGE 4 — GROQ GENERATION                               │
│  ├─ build messages:                                      │
│  │    system: medical assistant + guidelines             │
│  │    context: retrieved chunks (numbered)               │
│  │    history: prior turns (if memory=True)              │
│  │    user: normalized query                             │
│  ├─ call Groq API (llama-3.3-70b-versatile)              │
│  └─ receive: reply + chain-of-thought reasoning          │
│                                                          │
│  STAGE 5 — TRUST & SAFETY PIPELINE                       │
│  ├─ Confidence Estimation:                               │
│  │    0.35 × mean_retrieval_sim                          │
│  │  + 0.30 × answer_evidence_sim                         │
│  │  + 0.20 × (1 − hallucination_penalty)                 │
│  │  + 0.10 × retrieval_coverage_ratio                    │
│  │  + 0.05 × (1 − emergency_uncertainty_penalty)         │
│  ├─ Hallucination Verification:                          │
│  │    embed response sentences                           │
│  │    check each vs. retrieved chunks                    │
│  │    flag if >20% unsupported                           │
│  └─ XAI: extract chain-of-thought from LLM output        │
│                                                          │
│  STAGE 6 — RESPONSE TRANSLATION                          │
│  └─ if user lang != "en": translate reply back           │
│                                                          │
│  STAGE 7 — RESPONSE ASSEMBLY                             │
│  └─ return structured JSON (see contract below)          │
└─────────────────────┬───────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        ▼                             ▼
┌──────────────┐             ┌──────────────────┐
│  GROQ API    │             │  ChromaDB        │
│  (cloud LLM) │             │  (local vectors) │
└──────────────┘             └──────────────────┘
```

## Target API Response Contract

```json
{
  "reply": "string",
  "confidence": 0.87,
  "explanation": "Step-by-step reasoning from the model...",
  "evidence": [
    {
      "source": "MedlinePlus / PubMed / Guideline name",
      "excerpt": "Relevant chunk text...",
      "relevance_score": 0.91
    }
  ],
  "is_emergency": false,
  "alert_message": null,
  "language": "en",
  "hallucination_flag": false,
  "sources": ["MedlinePlus", "WHO Guidelines"]
}
```

## Architecture Decisions

| Decision | Choice | Reason |
|---|---|---|
| Keep Node + Python separate? | Yes | Node = auth/persistence. Python = AI pipeline. Clean separation. |
| Should Node call Groq directly? | No | All AI logic stays in Python. Node is a proxy + persistence layer. |
| FastAPI remains? | Yes | Restructured as pipeline orchestrator. No model loading anymore. |
| RAG storage | ChromaDB (local dev) | Simple, no hosting needed for dev/demo. |
| Embeddings | sentence-transformers/all-MiniLM-L6-v2 | Small, fast on CPU, well-tested. |
| LLM | Groq llama-3.3-70b-versatile | Fast (~750 tok/s), free tier available, large context. |
| Translation | deep-translator (Google backend) | Free, 100+ languages, simple API. |
| Voice | Browser Web Speech API | Zero dependencies, works for demo. |
