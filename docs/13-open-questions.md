# Open Questions & Decisions Required Before Coding

These decisions must be made before implementation begins. Each one affects architecture, file structure, or dependencies.

---

## 1. Groq Model Selection

**Question:** Which Groq model for the main medical response generation?

| Option | Context Window | Speed | Quality |
|---|---|---|---|
| `llama-3.3-70b-versatile` | 128k tokens | ~750 tok/s | Best |
| `mixtral-8x7b-32768` | 32k tokens | Fast | Good |
| `llama3-8b-8192` | 8k tokens | Fastest | Lower |

**Recommendation:** `llama-3.3-70b-versatile` for main responses; `llama3-8b-8192` for emergency classification only.

**Decision needed:** Confirm or override.

---

## 2. Medical Knowledge Source

**Question:** Which sources should be ingested for the RAG knowledge base?

| Option | Effort | Quality |
|---|---|---|
| MedlinePlus (1000+ articles, JSON API) | Low | Good for patient-facing |
| WHO Guidelines (PDFs) | Medium | Authoritative |
| StatPearls (clinical reference) | Medium | Clinical depth |
| PubMed abstracts (requires API key) | High | Research-grade |
| Custom dataset curated manually | Very High | Fully controlled |

**Recommendation:** Start with MedlinePlus + 20–30 WHO/clinical guideline PDFs.

**Decision needed:** Confirm scope of knowledge base before ingestion.

---

## 3. Translation Service

**Question:** Which service for query/response translation?

| Option | Cost | Privacy | Quality | Rate Limit |
|---|---|---|---|---|
| `deep-translator` (Google) | Free | Sends to Google | Good | Informal limits |
| Groq-based translation | Uses your quota | Stays in Groq | Excellent | Your plan limits |
| LibreTranslate (self-hosted) | Free | Private | Fair | None |
| DeepL API | Paid | Good | Excellent | Plan-based |

**Decision needed:** Choose before Phase 6 implementation.

---

## 4. Should Pipeline Run Async?

**Question:** Should emergency detection and RAG retrieval run in parallel (both don't depend on each other), or sequentially?

| Option | Latency | Complexity |
|---|---|---|
| Sequential (simple) | ~300–500ms for retrieval after emergency check | Low |
| Parallel with `asyncio.gather()` | ~100–200ms saved | Medium |

**Recommendation:** Sequential for Phase 1–2 (simpler). Add parallel execution in Phase 10 as an optimization.

**Decision needed:** Confirm approach before coding inference_server.py pipeline.

---

## 5. Vector Store — Development vs. Production

**Question:** ChromaDB (local) for development, then what for production?

| Option | Cost | Hosting | Scale |
|---|---|---|---|
| ChromaDB local | Free | Your machine | ~1M vectors |
| Pinecone | Free tier (100k vectors) | Hosted | Millions |
| Weaviate Cloud | Free tier | Hosted | Millions |
| Qdrant Cloud | Free tier | Hosted | Millions |

**Decision needed:** Is this project deployed to a server, or demo-only on local machine? This determines whether we need a hosted vector store.

---

## 6. Voice — Browser API vs. Whisper

**Question:** Which STT approach?

| Option | Browser Support | Accuracy | Extra Cost |
|---|---|---|---|
| Web Speech API | Chrome, Edge only | Good | Free |
| Groq Whisper (`whisper-large-v3`) | All browsers | Excellent | Uses Groq quota |

**Decision needed:** Is Firefox/Safari support required? If yes, must add Whisper.

---

## 7. Supported Languages

**Question:** Which languages beyond EN/ES should be supported?

The PPT mentions "regional languages." Possible list:
- Hindi (hi)
- Telugu (te)
- Tamil (ta)
- Arabic (ar)
- French (fr)
- German (de)
- Chinese Simplified (zh-CN)

`deep-translator` supports 100+ languages, so adding more is low effort. The question is whether the UI should show them all, and whether the RAG knowledge base should include non-English documents (currently planned as English-only, then translated).

**Decision needed:** Final language list for UI dropdown.

---

## 8. JWT Security — When to Fix

**Current bug:** `JWT_SECRET` falls back to `'fallback-secret'` if `.env` is missing. This is a security vulnerability.

**Question:** Fix this in Phase 1 (immediately) or Phase 10 (cleanup)?

**Recommendation:** Fix in Phase 1. It is a one-line change and a critical bug.

**Decision needed:** Confirm.

---

## 9. Chat Routing — Node Proxy vs. Direct Frontend

**Current situation:**
- Frontend calls `/ai/chat` → Vite proxy → Python directly (bypasses Node)
- Node has a broken `/api/chat` route that was intended to proxy to Python

**Question:** Should the frontend go through Node (authenticated, logged), or continue calling Python directly?

| Option | Auth on chat | Persistent logging | Complexity |
|---|---|---|---|
| Frontend → Node → Python | Yes (JWT required) | Yes (Node can save to DB) | Medium |
| Frontend → Python directly | No (no auth check) | No (Python doesn't write to DB) | Low |

**Recommendation:** Route through Node. The chat endpoint should require JWT auth (currently `/chatbot` page is unguarded). Node saves enriched messages to MongoDB after the AI response.

**Decision needed:** Confirm before Phase 1 and Phase 9.

---

## 10. Chatbot Auth Guard

**Current bug:** The `/chatbot` route in `App.tsx` has no auth guard. Any unauthenticated user can access it.

**Question:** Should we add a `ProtectedRoute` wrapper in Phase 1, or defer to Phase 10?

**Recommendation:** Phase 1 — it's a 5-line change and prevents unauthenticated users hitting the AI endpoint.

---

## Decision Summary Table

| # | Question | Recommendation | Urgency |
|---|---|---|---|
| 1 | Groq model choice | `llama-3.3-70b-versatile` + `llama3-8b-8192` for classification | Before Phase 1 |
| 2 | Knowledge base sources | MedlinePlus + 20–30 guidelines | Before Phase 2 |
| 3 | Translation service | `deep-translator` for demo | Before Phase 6 |
| 4 | Async pipeline? | Sequential (simpler) | Before Phase 1 |
| 5 | Vector store target | ChromaDB local for now | Before Phase 2 |
| 6 | Voice STT approach | Web Speech API (demo) | Before Phase 7 |
| 7 | Language list | EN, ES, HI, TE, FR, AR minimum | Before Phase 6 |
| 8 | JWT fix timing | Phase 1 | Before Phase 1 |
| 9 | Chat routing | Through Node (auth + DB) | Before Phase 1 |
| 10 | Chatbot auth guard | Phase 1 | Before Phase 1 |
