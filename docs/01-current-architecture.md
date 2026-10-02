# Current Architecture — Cura (Existing Codebase Audit)

## Overview

Three processes run simultaneously:

| Process | Technology | Port | Purpose |
|---|---|---|---|
| React frontend | Vite + React 18 + TypeScript + Tailwind | 5173 | User interface |
| Node/Express backend | Express 5 + Mongoose + JWT | 5000 | Auth, user/chat persistence, proxy |
| Python inference server | FastAPI + uvicorn | 8000 | Local LLM inference |

## Request Flow

```
User types message in Chatbot.tsx
  → fetch('/ai/chat', POST, {message, language, memory})
  → Vite proxy → http://localhost:8000/ai/chat   (bypasses Node entirely)
  → inference_server.py chat() function
  → prompt = "Question: {msg}\nAnswer:"
  → tokenizer → model.generate() → decode
  → {"reply": "...", "confidence": 0.9}
  → Chatbot.tsx renders data.reply as plain text
```

> **Critical mismatch:** `server.js` has a `/api/chat` route that proxies to Python `/chat` (line 69) — but Python's actual endpoint is `/ai/chat` (line 238). The Node proxy is broken and unused. The frontend goes directly to Python via the Vite `/ai` proxy.

## Stack Details

### Frontend — `project/src/`

| File | Role |
|---|---|
| `App.tsx` | Router setup, context providers |
| `pages/Chatbot.tsx` | Main chat UI, sends messages, renders responses |
| `pages/Login.tsx` / `Signup.tsx` | Auth pages |
| `pages/Profile.tsx` | Profile view/edit |
| `pages/Home.tsx`, `Features.tsx`, `About.tsx`, `UseCases.tsx`, `Contact.tsx` | Marketing pages |
| `components/Navbar.tsx` | Navigation bar |
| `contexts/AuthContext.tsx` | JWT auth state management |
| `contexts/ThemeContext.tsx` | Dark/light theme |
| `services/api.ts` | All HTTP calls to Node backend |
| `types/api.ts` | TypeScript types for API contract |

### Backend (Node) — `project/`

| File | Role |
|---|---|
| `server.js` | Express entry point, MongoDB connect, proxy route |
| `routes/users.js` | Register, login, get/update profile |
| `routes/chats.js` | Create, list, get, add message, delete chat sessions |
| `models/User.js` | Mongoose User schema |
| `models/Chat.js` | Mongoose Chat schema (messages array) |

### Backend (Python) — `project/`

| File | Role |
|---|---|
| `inference_server.py` | FastAPI app, model loading on startup, `/ai/chat` endpoint |
| `chat_reply.py` | Standalone test script (not used in production) |
| `test.py` | Not used in production |
| `model/` | LoRA adapter files (adapter_config.json, adapter_model.safetensors, tokenizer files) |
| `offload/` | CPU memory offloading folder |

## AI / Model Details

| What | Detail |
|---|---|
| Base model | `FreedomIntelligence/Apollo-2B` (downloaded from HuggingFace on startup) |
| Adapter | LoRA — rank 16, alpha 32, targets `q_proj` + `v_proj` |
| Adapter files | `project/model/adapter_config.json`, `adapter_model.safetensors` |
| Runtime | CPU only, float32, merged via `merge_and_unload()` |
| Startup time | Several minutes (model download + merge) |
| Inference time | 30–90 seconds per response |
| RAM requirement | ~8 GB minimum |
| Prompt format | `"Question: {message}\nAnswer:"` |
| Max new tokens | 200 |
| Confidence | Hardcoded `0.9` — not a real computation |

## MongoDB Models

### User
```
username, email, password (bcrypt), firstName, lastName,
profilePicture, isActive, lastLogin, createdAt, updatedAt
```

### Chat (message subdocument)
```
userId (ref User), sessionId, title, isActive,
messages: [{ role, content, timestamp }],
createdAt, updatedAt
```

## API Endpoints

| Method | Path | Auth | Handler |
|---|---|---|---|
| POST | `/ai/chat` | None | `inference_server.py:chat()` |
| POST | `/api/users/register` | None | `routes/users.js` |
| POST | `/api/users/login` | None | `routes/users.js` |
| GET | `/api/users/profile` | JWT | `routes/users.js` |
| PUT | `/api/users/profile` | JWT | `routes/users.js` |
| POST | `/api/chats/create` | JWT | `routes/chats.js` |
| GET | `/api/chats` | JWT | `routes/chats.js` |
| GET | `/api/chats/:sessionId` | JWT | `routes/chats.js` |
| POST | `/api/chats/:sessionId/messages` | JWT | `routes/chats.js` |
| PUT | `/api/chats/:sessionId/title` | JWT | `routes/chats.js` |
| DELETE | `/api/chats/:sessionId` | JWT | `routes/chats.js` |
| GET | `/api/inference/health` | None | `server.js` → Python |

## Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `MONGODB_URI` | `mongodb://localhost:27017/cura-app` | MongoDB connection |
| `PORT` | `5000` | Node server port |
| `JWT_SECRET` | `'fallback-secret'` (bug) | JWT signing key |
| `NODE_ENV` | `development` | Environment flag |

## Known Bugs & Problems

1. Node `/api/chat` proxy points to Python `/chat` — should be `/ai/chat`. Route is dead.
2. `JWT_SECRET` falls back to `'fallback-secret'` if `.env` missing — security risk.
3. Chat history in `Chatbot.tsx` is hardcoded static data — backend routes exist but frontend never calls them.
4. `language` and `memory` params are accepted but completely ignored.
5. `confidence` is always `0.9` and never displayed in UI.
6. `/health` endpoint missing from active Python code (only in commented-out block).
7. `node-fetch` in `package.json` but never imported — dead dependency.
8. `bitsandbytes` in `requirements.txt` but no quantization used — dead dependency.
9. Entire first implementation of `inference_server.py` is commented out in the same file (lines 1–152), duplicating the active code below.
10. No auth guard on `/chatbot` route — unauthenticated users can access it.
