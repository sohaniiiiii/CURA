# Voice Interaction — Design

## Current State

No voice functionality exists anywhere in the codebase. The application is text-only.

## Requirements (from PPT)

- Speech input: user speaks → text sent as message
- Speech output: bot response played as audio
- Must support elderly and visually impaired users

---

## Speech-to-Text (STT) — Voice Input

### Recommended Approach: Browser-native Web Speech API

**Why:** Zero additional dependencies, zero server changes, works immediately in Chrome and Edge.

```typescript
// src/hooks/useSpeechRecognition.ts

const recognition = new window.SpeechRecognition()
recognition.lang = selectedLanguage  // respects user's language selection
recognition.interimResults = false
recognition.maxAlternatives = 1

recognition.onresult = (event) => {
  const transcript = event.results[0][0].transcript
  setInputMessage(transcript)  // fill the textarea
}
```

**Integration in `Chatbot.tsx`:**
- Add a mic button (microphone icon) next to the send button
- On click: start recognition
- On result: populate `inputMessage` state
- Auto-send after transcript is received (optional UX choice)
- Show recording indicator while listening

**Browser support:**
| Browser | Support |
|---|---|
| Chrome | Full |
| Edge | Full |
| Firefox | Partial (flag required) |
| Safari | Partial (iOS 14.5+) |
| Mobile Chrome | Full |

### Fallback Approach: Groq Whisper Transcription

For broader support (Firefox, older browsers):

1. Record audio in browser using `MediaRecorder API`
2. Send audio blob to new backend endpoint: `POST /api/transcribe`
3. Node forwards to Python service: `POST http://localhost:8000/transcribe`
4. Python sends to Groq's Whisper endpoint:
   ```python
   transcription = groq_client.audio.transcriptions.create(
       file=audio_file,
       model="whisper-large-v3"
   )
   return {"transcript": transcription.text}
   ```
5. Frontend receives transcript, fills `inputMessage`

**Trade-off:** Browser API = no backend changes + no extra cost. Whisper = universal + better accuracy + uses Groq quota.

**Recommendation:** Implement browser Web Speech API first (demo-ready immediately). Add Whisper fallback in a later pass.

---

## Text-to-Speech (TTS) — Voice Output

### Recommended Approach: Browser-native SpeechSynthesis API

**Why:** Zero dependencies, zero server changes, works in all modern browsers.

```typescript
// src/hooks/useSpeechSynthesis.ts

const speak = (text: string, lang: string = "en") => {
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = lang         // respects response language
  utterance.rate = 0.9          // slightly slower for medical content
  utterance.pitch = 1.0
  window.speechSynthesis.speak(utterance)
}

const stop = () => {
  window.speechSynthesis.cancel()
}
```

**Integration in `Chatbot.tsx`:**
- Add a speaker icon button to each bot message footer
- On click: call `speak(message.content, detectedLanguage)`
- If already speaking: toggle to stop
- Show active state on button while speaking

### Upgrade Path: ElevenLabs / Google Cloud TTS

For production-quality voice (natural, medical-appropriate):

1. Add backend endpoint `POST /api/tts`
2. Python service calls ElevenLabs or Google Cloud TTS API
3. Return audio as base64 or stream
4. Frontend plays with `<audio>` element

**Trade-off:** Browser TTS = instant, free, basic quality. API TTS = high quality, costs money, adds latency.

**Recommendation:** Browser `speechSynthesis` for the demo. Cloud TTS for production.

---

## New Files Required

| File | Purpose |
|---|---|
| `src/hooks/useSpeechRecognition.ts` | Mic input hook wrapping Web Speech API |
| `src/hooks/useSpeechSynthesis.ts` | TTS hook wrapping SpeechSynthesis API |

## `Chatbot.tsx` Changes

```
Mic button (next to send):
  - Icon: Mic (from lucide-react — already installed)
  - State: isRecording: boolean
  - On click: toggle recognition start/stop
  - Visual: red pulsing border when recording

Speaker button (in each bot message footer, next to copy/thumbs):
  - Icon: Volume2 / VolumeX (from lucide-react)
  - State: isSpeaking: boolean (per message)
  - On click: speak(message.content) or stop if already speaking
```

## Multilingual Voice

When the response includes `language: "es"` (for example):
- STT: set `recognition.lang = "es-ES"`
- TTS: set `utterance.lang = "es-ES"`

This ensures voice interaction works in the detected/selected language end-to-end.

## No Backend Changes Required (for browser-native approach)

All voice processing happens in the browser. The backend API contract is unchanged. The only integration point is that the transcribed text is sent as a normal `message` in the existing `/api/chat` request body.
