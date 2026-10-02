# Groq Migration Plan

## Current vs. Target Model

| Aspect | Current | Target |
|---|---|---|
| Model | Apollo-2B + LoRA adapter (local) | Groq API — `llama-3.3-70b-versatile` |
| Location | Local CPU, `project/model/` | Cloud API (api.groq.com) |
| Startup time | Several minutes (download + merge) | Instant (HTTP client init) |
| Inference time | 30–90 seconds per response | 1–3 seconds per response |
| RAM requirement | ~8 GB minimum | Minimal (HTTP client only) |
| Cost | 0 (local) but hardware-intensive | Free tier: 14,400 req/day (30 rpm) |
| Scalability | Single machine, not scalable | Cloud API, scales horizontally |

## Recommended Groq Model

**Primary:** `llama-3.3-70b-versatile`
- ~750 tokens/second output speed
- 128k context window (large enough for RAG + history)
- Best quality for medical reasoning

**Fallback:** `mixtral-8x7b-32768`
- 32k context window
- Slightly faster, slightly lower quality

**For binary classifiers (emergency detection):** `llama3-8b-8192`
- Fastest, cheapest — appropriate for yes/no classification tasks

## What Happens to `inference_server.py`

The file is **restructured, not deleted.**

| Current section | Fate |
|---|---|
| Lines 1–152 (commented-out first implementation) | Delete — dead code |
| `load_model()` startup event | Remove entirely |
| `model`, `tokenizer` global variables | Remove |
| `OFFLOAD_DIR` setup | Remove |
| `model.generate()` call | Replace with `groq_client.chat.completions.create()` |
| FastAPI app setup, CORS, routes | Keep |
| `ChatRequest` / `ChatResponse` Pydantic models | Keep and extend |
| `/` root and `/health` endpoints | Keep |

## New `inference_server.py` Structure (conceptual)

```python
# startup: initialize groq client (instant)
# /chat endpoint:
#   Stage 1: language detection + translation
#   Stage 2: emergency pre-screen
#   Stage 3: RAG retrieval
#   Stage 4: build Groq messages + call API
#   Stage 5: confidence + hallucination + XAI
#   Stage 6: translate response back
#   Stage 7: return structured JSON
```

## Python Dependencies

### Remove

```
torch==2.1.0
transformers==4.36.0
peft==0.7.1
accelerate==0.25.0
bitsandbytes==0.41.3      # unused even now
safetensors==0.4.1
sentencepiece==0.1.99
protobuf==3.20.3
```

### Keep

```
fastapi==0.104.1
uvicorn[standard]==0.24.0
```

### Add

```
groq                        # Groq API client
python-dotenv               # Load .env in Python
langdetect                  # Language detection
deep-translator             # Translation (200+ language pairs)
sentence-transformers       # Query + chunk embeddings for RAG
chromadb                    # Local persistent vector store
langchain-text-splitters    # Document chunking (or custom)
httpx                       # Async HTTP client
```

## Node.js Changes

### `server.js`

- Fix the broken `/api/chat` proxy: change target from `/chat` to `/ai/chat`, or repurpose the endpoint to call Python cleanly
- Drop the 90-second timeout — reduce to 15 seconds (Groq is fast)
- Remove `node-fetch` from `package.json` (unused)

### `package.json`

- Remove `node-fetch` dependency

## Environment Variables

### Add to `project/.env`

```
GROQ_API_KEY=gsk_...your_key_here...
```

### Update `project/env.example`

```
# Groq API
GROQ_API_KEY=your-groq-api-key-here

# MongoDB
MONGODB_URI=mongodb://localhost:27017/cura-app

# Node server
PORT=5000
JWT_SECRET=your-super-secret-jwt-key-here
NODE_ENV=development
```

### Python `.env` (new file: `project/.env.python` or same `.env`)

```
GROQ_API_KEY=gsk_...
```

> The Groq key must never be sent to the frontend. It lives only in the Python service environment.

## API Contract — Changes

### Current response

```json
{
  "reply": "string",
  "confidence": 0.9
}
```

### Target response (additive — existing fields unchanged)

```json
{
  "reply": "string",
  "confidence": 0.87,
  "explanation": "string",
  "evidence": [
    { "source": "string", "excerpt": "string", "relevance_score": 0.91 }
  ],
  "is_emergency": false,
  "alert_message": null,
  "language": "en",
  "hallucination_flag": false,
  "sources": ["MedlinePlus", "WHO Guidelines"]
}
```

`reply` and `confidence` remain — existing frontend code will not break during migration.

## Files to Remove After Phase 1 is Confirmed Working

```
project/model/adapter_config.json
project/model/adapter_model.safetensors
project/model/special_tokens_map.json
project/model/tokenizer.json
project/model/tokenizer.model
project/offload/               (entire directory)
project/chat_reply.py
project/test.py
```

## Migration Validation Checklist

- [ ] Groq client initializes without error on startup
- [ ] `/health` endpoint returns 200 with `model_loaded: true`
- [ ] `/chat` returns a meaningful response in < 5 seconds
- [ ] Response includes `reply` and `confidence` fields
- [ ] Node `/api/chat` proxy correctly forwards to Python `/ai/chat`
- [ ] Frontend Chatbot page receives response and renders `data.reply`
- [ ] 90-second timeout removed from Node proxy
