# Multilingual Support — Design

## Current State

| Component | Status |
|---|---|
| EN/ES dropdown in `Chatbot.tsx` | Exists (UI only) |
| `language` param sent in request body | Exists (sent but ignored) |
| Language detection | Does not exist |
| Query translation (any lang → EN) | Does not exist |
| Response translation (EN → user lang) | Does not exist |
| Extended language list beyond EN/ES | Does not exist |

The `language` field travels from the frontend all the way to the Python server's `ChatRequest` model and is then silently discarded. The model always receives the same English-only prompt format.

## Target Flow

```
1. User submits query (any language)
      │
      ▼
2. langdetect.detect(query) → detected_lang (e.g., "es", "hi", "fr", "te")
      │
      ▼
3. if detected_lang != "en":
       translated_query = GoogleTranslator(
           source=detected_lang, target="en"
       ).translate(query)
   else:
       translated_query = query
      │
      ▼
4. normalized_query = translated_query.lower().strip()
      │
      ▼
5. Full pipeline runs in English:
   Emergency detection → RAG retrieval → Groq generation
      │
      ▼
6. if detected_lang != "en":
       final_reply = GoogleTranslator(
           source="en", target=detected_lang
       ).translate(groq_response)
   else:
       final_reply = groq_response
      │
      ▼
7. Return: { reply: final_reply, language: detected_lang, ... }
```

## What Exists vs. What Needs Building

| Step | Exists | What Needs Building |
|---|---|---|
| Language dropdown in UI | Yes | Expand to show more languages; show auto-detected label |
| `language` sent in request | Yes | Backend must now actually use it |
| Language detection (`langdetect`) | No | Add to Stage 1 of Python pipeline |
| Query translation → EN | No | Add `deep-translator` call after detection |
| RAG retrieval (English only) | No | Retrieval always in English — translation ensures this |
| Groq generation (English) | No (Phase 1) | Groq response is always in English internally |
| Response translation → user lang | No | Add translation call after Groq response |
| Detected language in response | No | Add `language` field to API response |

## Implementation — Python Service Changes

### New file: `project/rag/translator.py`

```python
from langdetect import detect
from deep_translator import GoogleTranslator

def detect_language(text: str) -> str:
    """Returns ISO 639-1 language code, e.g. 'en', 'es', 'hi'"""
    try:
        return detect(text)
    except Exception:
        return "en"  # fallback to English

def translate_to_english(text: str, source_lang: str) -> str:
    if source_lang == "en":
        return text
    return GoogleTranslator(source=source_lang, target="en").translate(text)

def translate_from_english(text: str, target_lang: str) -> str:
    if target_lang == "en":
        return text
    return GoogleTranslator(source="en", target=target_lang).translate(text)
```

### In `inference_server.py` — Stage 1

```python
from rag.translator import detect_language, translate_to_english, translate_from_english

detected_lang = detect_language(request.message)
normalized_query = translate_to_english(request.message, detected_lang)
```

### In `inference_server.py` — Stage 6

```python
final_reply = translate_from_english(groq_reply, detected_lang)
```

## Frontend Changes

### `Chatbot.tsx` — Language selector

- Keep the existing dropdown UI
- Add `auto` as the default option: "Auto-detect"
- Show the detected language returned in the API response
- Expand the options list:

```typescript
const languages: Language[] = [
  { code: 'auto', name: 'Auto-detect' },
  { code: 'EN', name: 'English' },
  { code: 'ES', name: 'Español' },
  { code: 'HI', name: 'Hindi' },
  { code: 'TE', name: 'Telugu' },
  { code: 'FR', name: 'Français' },
  { code: 'AR', name: 'العربية' },
  { code: 'ZH', name: '中文' },
];
```

### Detected language display

Each bot message footer shows the detected language: `Detected: Spanish` — useful feedback to the user confirming the system understood their language.

## New Dependencies

```
langdetect          # Language detection
deep-translator     # Translation via Google Translate backend
```

## Limitations and Known Constraints

| Constraint | Detail |
|---|---|
| `deep-translator` rate limits | Google Translate has informal rate limits on free use; excessive calls may be throttled. Alternative: use Groq itself for translation (costs API tokens). |
| `langdetect` accuracy | Requires at least 50 characters for reliable detection. Very short queries may misdetect. Fallback to English if confidence is low. |
| Medical terminology | Medical terms (e.g., "myocardial infarction") may be left untranslated by Google Translate — acceptable as RAG retrieval uses exact terms. |
| Translation quality | Machine translation may alter nuanced medical descriptions. Consider adding a disclaimer: *"Response was machine-translated from English."* |

## Open Question

**Translation service choice:**

| Option | Pros | Cons |
|---|---|---|
| `deep-translator` (Google) | Free, 100+ languages, simple | Rate limits, unofficial, privacy concerns |
| Groq-based translation | Uses existing Groq client, no extra dependency | Costs tokens, adds latency |
| LibreTranslate (self-hosted) | Open source, private | Setup overhead, quality varies |

Recommendation: **`deep-translator`** for development and demo. Swap to a paid translation API for production.
