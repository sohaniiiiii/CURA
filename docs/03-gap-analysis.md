# Gap Analysis — Current vs. Target (CURA-X)

## Feature Gap Table

| Requirement / Feature | Current Implementation | Target Requirement | Gap | Changes Required |
|---|---|---|---|---|
| **Medical chatbot** | Exists. React UI + FastAPI + Apollo-2B on CPU. 30–90s responses. | Fast, reliable, evidence-based medical assistant. | Model too slow, no evidence grounding. | Replace Apollo-2B with Groq API. Add RAG pipeline. |
| **Groq / LLM integration** | None. Local Apollo-2B + LoRA adapter. | Groq API (LLaMA-3 70B or Mixtral). | Entirely missing. | Remove model loading; add `groq` Python client. |
| **Precision RAG** | None. No vector store, no retrieval. | Precision RAG over trusted medical knowledge base on every request. | Entirely missing. | Build RAG pipeline: chunker → embedder → ChromaDB → retriever. |
| **Medical knowledge retrieval** | None. | Retrieve from trusted sources (MedlinePlus, clinical guidelines). | Entirely missing. | Build knowledge base + ingestion script. |
| **Multilingual support** | EN/ES UI dropdown exists. `language` param sent but completely ignored. | Detect language, translate to EN for retrieval, respond in user's language. | UI shell only — zero backend logic. | Add `langdetect`, `deep-translator`. Wire language in pipeline. |
| **Language detection** | None. | Auto-detect user's language from input text. | Entirely missing. | Add `langdetect` as Stage 1 of Python pipeline. |
| **Translation / normalization** | None. | Translate non-EN queries → EN for retrieval; translate response back. | Entirely missing. | Add translation layer in Python service. |
| **Confidence estimation** | Hardcoded `0.9` in `inference_server.py:266`. Never displayed. | Real composite score from retrieval relevance, answer-evidence agreement, hallucination check. | Both computation and display missing. | Implement composite formula; add `ConfidenceBadge` in UI. |
| **Confidence score display** | `confidence?: number` in `types/api.ts` but never rendered. | Colored badge (green/yellow/red) per response. | UI render missing; backend value fake. | Fix backend; add `ConfidenceBadge.tsx`. |
| **Explainable AI (XAI)** | None. | Chain-of-thought reasoning visible to user per response. | Entirely missing. | Chain-of-thought prompt to Groq; parse explanation; `ExplanationPanel.tsx`. |
| **Supporting evidence** | None. | Retrieved medical sources and excerpts shown alongside response. | Entirely missing. | Return `evidence[]` array from retriever; `EvidenceAccordion.tsx`. |
| **Hallucination verification** | None. | Cross-check response against retrieved chunks; flag unsupported claims. | Entirely missing. | `rag/verifier.py` — semantic similarity check; `hallucination_flag` in response. |
| **Emergency risk detection** | None. | Detect critical symptoms; show urgent alert banner. | Entirely missing. | `rag/emergency_detector.py`; `EmergencyBanner.tsx`; `is_emergency` field. |
| **Voice input (STT)** | None. | Microphone button → speech-to-text → send as message. | Entirely missing. | `useSpeechRecognition.ts` hook; mic button in `Chatbot.tsx`. |
| **Voice output (TTS)** | None. | Speaker button → text-to-speech playback per response. | Entirely missing. | `useSpeechSynthesis.ts` hook; speaker button per bot message. |
| **Chat history** | Backend complete (`Chat.js`, `routes/chats.js`). Frontend shows hardcoded static data, never calls API. | Real persisted, loadable chat history. | Backend ready. Frontend not wired. | Wire `chatAPI.getChats()`, `createChat()`, `getChat()` in `Chatbot.tsx`. |
| **Memory (session context)** | Toggle in UI. `memory` param sent in request. Completely ignored by model. | If memory=true: include prior turns in Groq prompt messages array. | Logic entirely missing. | Maintain in-session message array; pass to Groq messages when `memory=true`. |
| **Authentication** | Fully implemented. JWT + bcrypt + MongoDB. | Same. | None. | No changes needed. |
| **Database persistence** | MongoDB + Mongoose. Chat model exists but frontend never saves to it. | Full enriched message persistence (with confidence, evidence, etc.). | Chat routes unused from frontend. New message fields needed. | Wire frontend; extend message schema. |
| **Response generation** | `"Question: X\nAnswer:"` → Apollo-2B `model.generate()`. No system prompt, no context. | Groq with system prompt, retrieved context, conversation history, chain-of-thought. | Fundamentally different architecture. | Replace `inference_server.py` generation with Groq `chat.completions.create()`. |
| **Error handling** | Basic try/catch, generic strings, 90s timeout. | Typed errors per pipeline stage: model unavailable, retrieval failure, translation failure, emergency. | Too coarse, too broad. | Add typed error responses per stage. |
| **Performance** | 30–90s per response. Minutes to start (model load). | Sub-5s responses (Groq ~1–2s + RAG ~200–500ms). | Order-of-magnitude improvement needed. | Groq migration fixes this completely. |

## PPT Functional Requirements — Full Mapping

| PPT Requirement | Exists? | Status |
|---|---|---|
| Multilingual Input Processing — detect, translate, normalize | No | Build from scratch |
| Medical Knowledge Retrieval — Precision RAG from trusted sources | No | Build from scratch |
| Medical Response Generation — evidence-based via Medical LLM | Partial | Response exists; replace model and add grounding |
| Confidence Estimation — calculate and display | No | Hardcoded fake value; full build needed |
| Explainable AI — supporting evidence and explanations | No | Build from scratch |
| Hallucination Verification — validate response vs. retrieved knowledge | No | Build from scratch |
| Emergency Risk Detection — identify critical symptoms, alert | No | Build from scratch |
| Text & Voice Interaction — speech input and audio output | No | Build from scratch (browser APIs) |

## PPT Non-Functional Requirements — Mapping

| NFR | Current State | Gap |
|---|---|---|
| **Accuracy** | Low — hallucination-prone local model, no retrieval | No evidence grounding; fix via RAG + Groq |
| **Reliability** | Low — Python crashes on OOM, 90s timeouts | Groq API removes local model instability |
| **Usability** | Partial — clean UI, missing confidence, voice, real history | Multiple frontend additions needed |
| **Performance** | Poor — 30–90s per query | Groq cuts to ~1–2s |
| **Security & Privacy** | Partial — JWT auth, bcrypt | No rate limiting, JWT fallback secret, queries unencrypted at rest |
| **Scalability** | Poor — single machine local model | Groq is cloud; ChromaDB replaceable with hosted vector store |

## Gap Severity Summary

| Category | Severity |
|---|---|
| LLM / Inference | Critical — replace immediately |
| RAG | Critical — build from scratch |
| Confidence estimation | High — fake value, needs real computation |
| Hallucination verification | High — not implemented |
| Emergency detection | High — not implemented |
| XAI / Explanation | High — not implemented |
| Multilingual (backend) | High — UI shell only |
| Voice | Medium — browser APIs available, minimal work |
| Chat history (frontend) | Medium — backend done, frontend not wired |
| Memory (session context) | Medium — param sent, logic missing |
| Auth / DB | None — complete and solid |
| Security hardening | Low-Medium — JWT fallback secret, rate limiting |
