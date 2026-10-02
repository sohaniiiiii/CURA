# Migration Roadmap — CURA-X Implementation Phases

## Recommended Execution Order

```
Phase 1 (Groq)
  → Phase 2 (RAG)
  → Phase 3 (Confidence)
  → Phase 4 (Hallucination + XAI)
  → Phase 5 (Emergency Detection)
  → Phase 6 (Multilingual)
  → Phase 7 (Voice)
  → Phase 8 (Frontend)
  → Phase 9 (Database integration)
  → Phase 10 (Testing + Cleanup)
```

Each phase produces a working, testable system. Never start a phase until the previous phase is verified working.

---

## Phase 1 — Backend Architecture + Groq Migration

**Goal:** Replace Apollo-2B with Groq. Make chat fast and functional. Fix broken proxy.

### Files to Modify

| File | Change |
|---|---|
| `project/inference_server.py` | Remove all model loading code (lines 1–231). Add `groq.Client()`. Replace `model.generate()` with `groq_client.chat.completions.create()`. |
| `project/requirements.txt` | Remove 8 ML packages. Add `groq`, `python-dotenv`. |
| `project/server.js` | Fix proxy: change `/chat` to `/ai/chat`. Change timeout from 90s to 15s. |
| `project/env.example` | Add `GROQ_API_KEY=your-key-here`. |

### Files to Create

| File | Purpose |
|---|---|
| `project/.env` | Add `GROQ_API_KEY`. |

### Files to Remove (after Phase 1 confirmed)

```
project/model/           (all adapter weight files)
project/offload/         (entire directory)
project/chat_reply.py
project/test.py
```

### Dependencies

- Groq API key (free at console.groq.com)
- `groq` Python package
- `python-dotenv` Python package

### Expected Input / Output

- **Input:** `{ message: str, language: str, memory: bool }`
- **Output:** `{ reply: str, confidence: float }` (confidence still hardcoded 0.9 until Phase 3)

### Validation Checklist

- [ ] Python server starts in < 2 seconds (no model loading)
- [ ] `/health` endpoint returns 200
- [ ] `/ai/chat` returns meaningful response in < 5 seconds
- [ ] Node `/api/chat` proxy correctly reaches Python
- [ ] Frontend Chatbot renders response

---

## Phase 2 — RAG / Medical Knowledge Retrieval

**Goal:** Add ChromaDB vector store and retrieval pipeline. Every Groq call now uses retrieved evidence as context.

**Depends on:** Phase 1 complete.

### Files to Modify

| File | Change |
|---|---|
| `project/inference_server.py` | Add Stage 3: call retriever before building Groq prompt. Inject retrieved chunks into prompt. Add `evidence[]` to response. |
| `project/requirements.txt` | Add `chromadb`, `sentence-transformers`, `langchain-text-splitters`. |

### Files to Create

| File | Purpose |
|---|---|
| `project/rag/__init__.py` | Package init |
| `project/rag/embedder.py` | Load sentence-transformer; expose `encode(text)` |
| `project/rag/retriever.py` | Query ChromaDB; return top-k chunks |
| `project/rag/ingest.py` | One-time script: chunk → embed → store in ChromaDB |
| `project/rag/data/` | Directory for source documents |
| `project/rag/chroma_db/` | ChromaDB persistent storage (gitignored) |

### Files to Remove

None.

### Dependencies

- `chromadb` Python package
- `sentence-transformers` Python package
- `langchain-text-splitters` Python package
- Medical source data in `rag/data/` (MedlinePlus JSON, PDFs)

### Expected Input / Output

- **Retriever input:** English query string
- **Retriever output:** `[{ text, source, title, url, score }]` — top-5 chunks
- **Groq prompt:** now includes numbered context block from retrieved chunks
- **API response:** adds `evidence: []` and `sources: []` fields

### Validation Checklist

- [ ] `ingest.py` runs successfully and populates ChromaDB
- [ ] `retriever.py` returns relevant chunks for a test query
- [ ] Groq prompt includes context block
- [ ] API response includes `evidence[]` array
- [ ] Response quality visibly improves (grounded in real medical info)

---

## Phase 3 — Confidence Estimation

**Goal:** Replace hardcoded `0.9` with a real composite confidence score.

**Depends on:** Phase 2 (needs retrieval similarity scores).

### Files to Modify

| File | Change |
|---|---|
| `project/inference_server.py` | Add `compute_confidence()` function. Call it after Groq generation. Return real score. |
| `project/src/pages/Chatbot.tsx` | Read `data.confidence` and pass to `ConfidenceBadge`. |
| `project/src/types/api.ts` | `confidence` already typed; no change needed. |

### Files to Create

| File | Purpose |
|---|---|
| `project/src/components/ConfidenceBadge.tsx` | Colored badge UI component |

### Dependencies

- Phase 2 (retrieval scores needed as input)
- `sentence-transformers` (already added in Phase 2 for query embedding; also used for answer-evidence similarity)

### Expected Input / Output

- **Input:** retrieval scores, response text, retrieved chunks
- **Output:** `confidence: float` (0.0–1.0) — real computed value
- **UI:** Colored badge in each bot message footer

---

## Phase 4 — Hallucination Verification + XAI

**Goal:** Verify response against evidence; surface chain-of-thought to users.

**Depends on:** Phase 3.

### Files to Modify

| File | Change |
|---|---|
| `project/inference_server.py` | Update Groq prompt to include CoT instruction. Add `extract_explanation()` to parse reasoning. Add `verify_hallucination()`. Return `explanation`, `hallucination_flag` fields. |
| `project/src/pages/Chatbot.tsx` | Pass `explanation` to `ExplanationPanel`. Pass `hallucination_flag` to `HallucinationWarning`. |
| `project/src/types/api.ts` | Add `explanation?: string`, `hallucination_flag?: boolean` to `ChatResponse`. |

### Files to Create

| File | Purpose |
|---|---|
| `project/rag/verifier.py` | `verify_hallucination(response, chunks)` → `(flag, penalty)` |
| `project/src/components/ExplanationPanel.tsx` | Collapsible chain-of-thought display |
| `project/src/components/EvidenceAccordion.tsx` | Collapsible sources display |
| `project/src/components/HallucinationWarning.tsx` | Inline yellow warning |

### Expected Input / Output

- **Groq prompt:** includes `"Reasoning: [step by step] Answer: [response]"` instruction
- **Output adds:** `explanation: str`, `hallucination_flag: bool`
- **UI:** Collapsible "Why this answer?" section; collapsible "Sources"; inline warning if flagged

---

## Phase 5 — Emergency Risk Detection

**Goal:** Detect medical emergencies; show prominent alert to users.

**Depends on:** Phase 1 (Groq must work for LLM classification).

### Files to Modify

| File | Change |
|---|---|
| `project/inference_server.py` | Add Stage 2 (pre-retrieval): keyword check then LLM binary classification. Return `is_emergency`, `alert_message`. |
| `project/src/pages/Chatbot.tsx` | Render `EmergencyBanner` when `is_emergency=true`. |
| `project/src/types/api.ts` | Add `is_emergency?: boolean`, `alert_message?: string` to `ChatResponse`. |

### Files to Create

| File | Purpose |
|---|---|
| `project/rag/emergency_detector.py` | Keyword list + LLM binary classifier |
| `project/src/components/EmergencyBanner.tsx` | Full-width red alert banner |

### Expected Input / Output

- **Input:** user query string
- **Output adds:** `is_emergency: bool`, `alert_message: str | null`
- **UI:** Red full-width banner above response when emergency detected

---

## Phase 6 — Multilingual Support

**Goal:** Detect user language, translate query to English for retrieval, translate response back.

**Depends on:** Phase 2 (retrieval must work in English).

### Files to Modify

| File | Change |
|---|---|
| `project/inference_server.py` | Add Stage 1: language detection + translation. Add Stage 6: translate response back. Return `language` field. |
| `project/requirements.txt` | Add `langdetect`, `deep-translator`. |
| `project/src/pages/Chatbot.tsx` | Expand language list; show auto-detect option; display detected language. |
| `project/src/types/api.ts` | Add `language?: string` to `ChatResponse`. |

### Files to Create

| File | Purpose |
|---|---|
| `project/rag/translator.py` | `detect_language()`, `translate_to_english()`, `translate_from_english()` |

### Expected Input / Output

- **Input:** query in any language
- **Pipeline:** query translated to EN → retrieval + Groq in EN → response translated back
- **Output adds:** `language: str` (detected language code)

---

## Phase 7 — Voice Interaction

**Goal:** Add microphone input (STT) and speaker output (TTS) using browser Web Speech API.

**Depends on:** Phase 6 (language detection informs STT/TTS lang).

### Files to Modify

| File | Change |
|---|---|
| `project/src/pages/Chatbot.tsx` | Add mic button; add speaker button per bot message; wire to hooks. |

### Files to Create

| File | Purpose |
|---|---|
| `project/src/hooks/useSpeechRecognition.ts` | Web Speech API STT hook |
| `project/src/hooks/useSpeechSynthesis.ts` | Web Speech API TTS hook |

### No backend changes required.

### Expected Input / Output

- **STT:** mic button → transcript → fills `inputMessage` textarea
- **TTS:** speaker button → plays `message.content` as audio in detected language

---

## Phase 8 — Frontend Redesign / Integration

**Goal:** Wire all new API fields to new UI components. Complete the chatbot page redesign.

**Depends on:** Phases 3–7 (all new response fields must exist).

### Files to Modify

| File | Change |
|---|---|
| `project/src/pages/Chatbot.tsx` | Major: wire all new components; wire chat history to API; update message type; multi-step loading indicator. |
| `project/src/services/api.ts` | Replace hardcoded base URL with env var; update response type. |
| `project/src/types/api.ts` | Add full `ChatResponse` and `Evidence` types. |
| `project/vite.config.ts` | Remove `/ai` proxy (Python no longer called directly from frontend). |

### All new component files (from Phases 3–7) already created.

### Expected Result

Full CURA-X frontend: confidence badge, sources accordion, explanation panel, emergency banner, hallucination warning, mic button, speaker button, real chat history sidebar, working new chat button.

---

## Phase 9 — Database / Chat History Integration

**Goal:** Persist enriched messages to MongoDB; load real chat history.

**Depends on:** Phase 8.

### Files to Modify

| File | Change |
|---|---|
| `project/models/Chat.js` | Add all new fields to message subdocument schema. |
| `project/routes/chats.js` | Ensure new fields accepted in `addMessage` route. |
| `project/server.js` | After receiving AI response, save full enriched message to MongoDB before returning. |

### Optional File to Create

| File | Purpose |
|---|---|
| `project/models/KnowledgeSource.js` | Track ingested documents (optional admin feature) |

---

## Phase 10 — Testing + Cleanup

**Goal:** Validate full pipeline; remove dead code; harden security.

### Files to Modify

| File | Change |
|---|---|
| `project/inference_server.py` | Remove commented-out first implementation block (lines 1–152). |
| `project/routes/users.js` | Extract JWT parsing into shared `authMiddleware.js` (DRY). |
| `project/server.js` | Add `express-rate-limit`; remove JWT fallback secret. |
| `project/src/services/api.ts` | Confirm base URL uses env var. |
| `project/env.example` | Document all env vars with descriptions. |
| `project/package.json` | Remove unused `node-fetch` dependency. |
| `project/requirements.txt` | Confirm all old ML packages removed. |

### Files to Create

| File | Purpose |
|---|---|
| `project/routes/middleware/authMiddleware.js` | Shared JWT auth middleware |

### Files to Remove (final confirmation)

```
project/model/               (if not removed in Phase 1)
project/offload/             (if not removed in Phase 1)
project/chat_reply.py        (if not removed in Phase 1)
project/test.py              (if not removed in Phase 1)
```

### New Node.js dependency

```
express-rate-limit
```

---

## Summary Table

| Phase | Goal | Key Files Changed | Key Files Created | Depends On |
|---|---|---|---|---|
| 1 | Groq migration | `inference_server.py`, `server.js`, `requirements.txt` | `.env` | — |
| 2 | RAG retrieval | `inference_server.py`, `requirements.txt` | `rag/` directory + ingestion pipeline | Phase 1 |
| 3 | Confidence score | `inference_server.py`, `Chatbot.tsx` | `ConfidenceBadge.tsx` | Phase 2 |
| 4 | Hallucination + XAI | `inference_server.py`, `Chatbot.tsx` | `verifier.py`, 3 UI components | Phase 3 |
| 5 | Emergency detection | `inference_server.py`, `Chatbot.tsx` | `emergency_detector.py`, `EmergencyBanner.tsx` | Phase 1 |
| 6 | Multilingual | `inference_server.py`, `Chatbot.tsx` | `translator.py` | Phase 2 |
| 7 | Voice | `Chatbot.tsx` | 2 custom hooks | Phase 6 |
| 8 | Frontend complete | `Chatbot.tsx`, `api.ts`, `types/api.ts` | — | Phases 3–7 |
| 9 | DB integration | `Chat.js`, `chats.js`, `server.js` | `KnowledgeSource.js` (optional) | Phase 8 |
| 10 | Cleanup | Multiple | `authMiddleware.js` | Phase 9 |
