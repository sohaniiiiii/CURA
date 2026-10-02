# ============================================================
# PHASE 1 — Groq migration (Apollo-2B replaced)
# Old Apollo-2B + LoRA implementation preserved below as
# comments so it can be restored if needed.
# ============================================================

# ---- OLD IMPLEMENTATION (Apollo-2B + LoRA) — DO NOT DELETE ----
# from fastapi import FastAPI, HTTPException
# from fastapi.middleware.cors import CORSMiddleware
# from pydantic import BaseModel
# import torch
# from transformers import AutoTokenizer, AutoModelForCausalLM
# from peft import PeftModel
# import logging
# import os
#
# logging.basicConfig(level=logging.INFO)
# logger = logging.getLogger(__name__)
#
# app = FastAPI()
#
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )
#
# class ChatRequest(BaseModel):
#     message: str
#     language: str = "EN"
#     memory: bool = True
#
# class ChatResponse(BaseModel):
#     reply: str
#     confidence: float = 1.0
#
# model = None
# tokenizer = None
#
# OFFLOAD_DIR = "./offload"
# os.makedirs(OFFLOAD_DIR, exist_ok=True)
#
# @app.on_event("startup")
# async def load_model():
#     global model, tokenizer
#     try:
#         logger.info("Loading Apollo-2B with PEFT adapter...")
#         BASE = "FreedomIntelligence/Apollo-2B"
#         ADAPTER = "./model"
#         tokenizer = AutoTokenizer.from_pretrained(BASE, trust_remote_code=True)
#         tokenizer.pad_token = tokenizer.eos_token
#         base = AutoModelForCausalLM.from_pretrained(
#             BASE,
#             trust_remote_code=True,
#             torch_dtype=torch.float32,
#             device_map={"": "cpu"},
#             offload_folder=OFFLOAD_DIR,
#         )
#         peft_model = PeftModel.from_pretrained(
#             base, ADAPTER,
#             device_map={"": "cpu"},
#             offload_folder=OFFLOAD_DIR,
#         )
#         model = peft_model.merge_and_unload()
#         model.eval()
#         logger.info("Model loaded successfully with merged LoRA!")
#     except Exception as e:
#         logger.error(f"Error loading model: {str(e)}")
#         raise
#
# @app.get("/")
# async def root():
#     return {"message": "Apollo-2B Cura AI", "status": "healthy"}
#
# @app.post("/ai/chat", response_model=ChatResponse)
# async def chat(request: ChatRequest):
#     global model, tokenizer
#     if model is None:
#         raise HTTPException(status_code=503, detail="Model not loaded")
#     try:
#         prompt = f"Question: {request.message}\nAnswer:"
#         inputs = tokenizer(prompt, return_tensors="pt", truncation=True, max_length=512)
#         with torch.no_grad():
#             output = model.generate(
#                 **inputs,
#                 max_new_tokens=200,
#                 temperature=0.7,
#                 top_p=0.9,
#                 do_sample=True,
#                 pad_token_id=tokenizer.pad_token_id,
#                 eos_token_id=tokenizer.eos_token_id
#             )
#         response_text = tokenizer.decode(output[0], skip_special_tokens=True)
#         if "Answer:" in response_text:
#             response_text = response_text.split("Answer:")[-1].strip()
#         return ChatResponse(reply=response_text, confidence=0.9)
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")
#
# if __name__ == "__main__":
#     import uvicorn
#     uvicorn.run(app, host="0.0.0.0", port=8000)
# ---- END OLD IMPLEMENTATION ----


# ============================================================
# PHASE 1 — NEW IMPLEMENTATION: Groq API
# ============================================================

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq
from dotenv import load_dotenv
import logging
import os

load_dotenv(override=True)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="CURA-X AI Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5000",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

if not GROQ_API_KEY:
    raise RuntimeError(
        "GROQ_API_KEY environment variable is not set. Add it to your .env file."
    )

groq_client = Groq(api_key=GROQ_API_KEY)

# ---- OLD prompt: forced the same template onto every reply (greetings and
# follow-ups included) ----
# SYSTEM_PROMPT = (
#     "You are CURA-X, a friendly medical assistant. "
#     "Keep every reply under 150 words. "
#     "Use plain short bullet points, no tables, no long headers. "
#     "Start directly with the answer — skip greetings and sympathy lines. "
#     "Group advice under two short labels: 'Home remedies:' and 'OTC options:'. "
#     "End with one line: 'See a doctor if: ...' when relevant. "
#     "Finish with: '*Consult a healthcare professional for personal advice.*' "
#     "Never use markdown tables or horizontal dividers."
# )

# Tag the model puts at the very start of non-health small-talk replies.
# It is stripped here and reported as type="smalltalk" so the UI can skip
# the medical answer card (confidence / sources / explanation).
SMALLTALK_TAG = "[SMALLTALK]"

SYSTEM_PROMPT = (
    "You are CURA-X, a friendly medical assistant. "
    "Answer exactly what the user asked — directly, in under 150 words. "
    "Use plain short bullet points where they help; never use markdown tables, "
    "horizontal dividers or long headers. In health answers, skip greetings and sympathy lines. "
    "Pick the format that fits the question: "
    "(1) Symptoms or 'what should I do' questions: give only the relevant groups among "
    "'Home remedies:' and 'OTC options:', then one line 'See a doctor if: ...'. "
    "(2) Questions about a condition, medicine, dose, or test: answer the question directly "
    "in a few bullets; add 'See a doctor if: ...' only when it is genuinely relevant. "
    "(3) Follow-up questions: answer only the new question; do not repeat advice, "
    "remedies or warning signs you already gave earlier in the conversation. "
    "Finish every health-related answer with: '*Consult a healthcare professional for personal advice.*' "
    f"If the user's message is a greeting, thanks, or small talk that is not about health, "
    f"start your reply with the exact tag {SMALLTALK_TAG} and then reply in one or two friendly "
    "sentences inviting a health question, with no bullet points and no disclaimer."
)


# ------------------------------------------------------------
# Language support (EN / ES only). English uses SYSTEM_PROMPT exactly as
# before; Spanish appends an instruction for the same model to answer in
# Spanish. No translation API, no auto-detection.
# ------------------------------------------------------------
# OLD: SUPPORTED_LANGUAGES = {"EN", "ES"}
SUPPORTED_LANGUAGES = {"EN", "ES", "HI"}

SPANISH_INSTRUCTION = (
    " IMPORTANT: Respond entirely in Spanish (español), even if earlier messages "
    "in the conversation are in English. When you use those sections, use these Spanish "
    "labels instead of the English ones: 'Remedios caseros:' (Home remedies), 'Opciones de venta libre:' "
    "(OTC options), 'Consulte a un médico si: ...' (See a doctor if). "
    "End health-related answers with: '*Consulte a un profesional de la salud para recibir asesoramiento personal.*' "
    f"Keep the {SMALLTALK_TAG} tag in English exactly as written when it applies."
)


HINDI_INSTRUCTION = (
    " IMPORTANT: Respond entirely in Hindi (हिन्दी) written in Devanagari script, even if "
    "earlier messages in the conversation are in another language. Keep common medicine "
    "names (e.g. paracetamol, ibuprofen) recognisable. When you use those sections, use these "
    "Hindi labels instead of the English ones: 'घरेलू उपचार:' (Home remedies), 'बिना पर्ची की दवाएँ:' (OTC options), "
    "'डॉक्टर से मिलें यदि: ...' (See a doctor if). "
    "End health-related answers with: '*व्यक्तिगत सलाह के लिए किसी स्वास्थ्य विशेषज्ञ से परामर्श करें।*' "
    f"Keep the {SMALLTALK_TAG} tag in English exactly as written when it applies."
)


# Per-language output budget. EN unchanged at 600; Spanish runs longer and
# Hindi (Devanagari) uses several tokens per word, which truncated replies.
MAX_TOKENS = {"EN": 600, "ES": 800, "HI": 1200}


def normalize_language(code: str) -> str:
    code = (code or "EN").strip().upper()
    return code if code in SUPPORTED_LANGUAGES else "EN"


def build_system_prompt(language: str) -> str:
    if language == "ES":
        return SYSTEM_PROMPT + SPANISH_INSTRUCTION
    if language == "HI":
        return SYSTEM_PROMPT + HINDI_INSTRUCTION
    return SYSTEM_PROMPT  # English: unchanged


class ChatRequest(BaseModel):
    message: str
    language: str = "EN"
    memory: bool = True
    history: list[dict] = []


class ChatResponse(BaseModel):
    reply: str
    confidence: float = 1.0
    language: str = "EN"  # language the reply was requested in
    type: str = "medical"  # "medical" | "smalltalk" (greetings etc. get no answer card)


@app.get("/")
async def root():
    return {
        "message": "CURA-X AI Service",
        "model": GROQ_MODEL,
        "status": "healthy",
    }


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "model": GROQ_MODEL,
        "provider": "Groq",
    }


@app.post("/ai/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    try:
        language = normalize_language(request.language)
        system_prompt = build_system_prompt(language)
        # Longer-worded / non-Latin languages need more tokens for the same answer
        max_tokens = MAX_TOKENS.get(language, 600)
        # OLD: messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        messages = [{"role": "system", "content": system_prompt}]

        # Include conversation history if memory is enabled.
        # Sanitize: only keep turns that strictly alternate user → assistant.
        # This prevents consecutive same-role messages from confusing the model.
        if request.memory and request.history:
            sanitized = []
            expected = "user"
            for turn in request.history[-10:]:
                role = turn.get("role")
                content = (turn.get("content") or "").strip()
                if role == expected and content:
                    sanitized.append({"role": role, "content": content})
                    expected = "assistant" if expected == "user" else "user"
            # history must start with user and end with assistant for context
            if sanitized and sanitized[-1]["role"] == "user":
                sanitized = sanitized[:-1]  # drop unpaired trailing user turn
            messages.extend(sanitized)

        messages.append({"role": "user", "content": request.message})

        logger.info(
            f"Calling Groq ({GROQ_MODEL}) | lang={language} | messages={len(messages)} | "
            f"query='{request.message[:60]}...'"
        )

        completion = groq_client.chat.completions.create(
            model=GROQ_MODEL,
            messages=messages,
            temperature=0.3,
            max_tokens=max_tokens,  # OLD: 600 (English is still 600)
        )

        reply = (completion.choices[0].message.content or "").strip()
        if not reply:
            # Model returned empty — retry once with no history before giving up
            logger.warning("Empty reply from model, retrying without history...")
            completion = groq_client.chat.completions.create(
                model=GROQ_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": request.message},
                ],
                temperature=0.3,
                max_tokens=max_tokens,
            )
            reply = (completion.choices[0].message.content or "").strip()
        if not reply:
            reply = "I'm sorry, I wasn't able to generate a response. Please try rephrasing your question."

        logger.info("Groq response received successfully")

        # confidence is hardcoded 1.0 in Phase 1.
        # Phase 3 will replace this with a real computed score.
        # Detect + strip the small-talk tag (tolerate stray whitespace/markdown around it)
        reply_type = "medical"
        if SMALLTALK_TAG in reply[:40]:
            reply_type = "smalltalk"
        if reply_type == "smalltalk":
            reply = reply.replace(SMALLTALK_TAG, "").strip().strip("*_").strip()
        else:
            reply = reply.replace(SMALLTALK_TAG, "").strip()
        if not reply:
            reply = "I'm sorry, I wasn't able to generate a response. Please try rephrasing your question."
            reply_type = "medical"

        return ChatResponse(reply=reply, confidence=1.0, language=language, type=reply_type)

    except Exception as e:
        logger.error(f"Groq inference error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
