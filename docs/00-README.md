# CURA-X — Architecture & Migration Documentation

This folder contains the complete audit, gap analysis, and migration plan for upgrading the existing Cura chatbot into the CURA-X framework described in the project review PPT.

> **IMPORTANT:** These are planning documents only. No code has been modified.

---

## Document Index

| File | Contents |
|---|---|
| `01-current-architecture.md` | Full audit of the existing codebase — stack, files, flow, bugs |
| `02-target-architecture.md` | CURA-X target system design — complete flow diagram and architecture decisions |
| `03-gap-analysis.md` | Side-by-side comparison of current vs. target for every feature |
| `04-groq-migration.md` | Detailed plan to replace Apollo-2B with Groq API |
| `05-confidence-score.md` | Real confidence estimation design — formula, signals, implementation |
| `06-rag-design.md` | Precision RAG pipeline — knowledge sources, chunking, embedding, retrieval |
| `07-multilingual-support.md` | Language detection, query translation, response translation design |
| `08-trust-and-safety.md` | Confidence, XAI, hallucination verification, emergency detection — full design |
| `09-voice-interaction.md` | STT and TTS design using Web Speech API + Whisper fallback |
| `10-frontend-changes.md` | All new UI components and changes to Chatbot.tsx |
| `11-database-changes.md` | MongoDB schema updates for enriched message storage |
| `12-migration-roadmap.md` | 10-phase implementation plan with files, dependencies, validation checklists |
| `13-open-questions.md` | Decisions that must be made before coding begins |

---

## Quick Summary

### Current System
- React + Vite frontend
- Node/Express backend (auth + DB)
- Python/FastAPI inference server (local Apollo-2B + LoRA, 30–90s responses)
- MongoDB (chat model exists but not used from frontend)

### Target System (CURA-X)
- React + Vite + Web Speech API frontend
- Node/Express backend (unchanged role)
- Python/FastAPI AI pipeline (Groq + ChromaDB RAG + trust & safety)
- MongoDB (enriched message storage)
- Groq API (LLaMA-3 70B)
- ChromaDB (local vector store)
- sentence-transformers (embeddings)
- deep-translator + langdetect (multilingual)

### What Is Completely Missing (Must Build from Scratch)

1. RAG pipeline (no vector store, no retrieval)
2. Groq integration (no cloud LLM)
3. Real confidence estimation (hardcoded 0.9)
4. Hallucination verification
5. Explainable AI / chain-of-thought
6. Emergency risk detection
7. Multilingual backend logic (UI only)
8. Voice input/output
9. Real chat history in frontend (backend done, not wired)

### What Already Works (Keep)

- JWT authentication
- User registration and login
- MongoDB models (User, Chat)
- All chat persistence routes (backend)
- React routing
- Tailwind UI structure
- Vite dev server + proxy setup

---

## Start Here Before Coding

Read `13-open-questions.md` first. There are 10 architectural decisions that must be resolved before Phase 1 begins.
