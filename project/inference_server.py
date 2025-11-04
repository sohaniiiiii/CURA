from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# CORS - allow Node backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5000",    # Node backend
        "http://localhost:5173",    # React dev
        "http://localhost:5174",
        "http://localhost:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request/Response models
class ChatRequest(BaseModel):
    message: str
    language: str = "EN"
    memory: bool = True

class ChatResponse(BaseModel):
    reply: str
    confidence: float = 1.0

# Global variables for model and tokenizer
model = None
tokenizer = None

@app.on_event("startup")
async def load_model():
    """Load YOUR fine-tuned model on startup"""
    global model, tokenizer
    
    try:
        logger.info("🔄 Loading YOUR Apollo-2B fine-tuned model...")
        
        BASE = "FreedomIntelligence/Apollo-2B"
        ADAPTER = "./model"  # ← YOUR PEFT adapter with fine-tuning
        
        logger.info(f"📁 Adapter path: {ADAPTER}")
        
        # Load tokenizer
        tokenizer = AutoTokenizer.from_pretrained(BASE)
        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token
        
        # Load base model
        logger.info(f"📥 Loading base model: {BASE}")
        base = AutoModelForCausalLM.from_pretrained(
            BASE,
            dtype=torch.float32,
            trust_remote_code=True,
            low_cpu_mem_usage=True,
        )
        
        # Load YOUR PEFT adapter (this applies your fine-tuning)
        logger.info(f"🎯 Loading YOUR fine-tuned adapter from: {ADAPTER}")
        model = PeftModel.from_pretrained(base, ADAPTER).eval()
        
        logger.info("✅ YOUR FINE-TUNED MODEL LOADED SUCCESSFULLY!")
        logger.info(f"🧠 Model is ready with your custom training from {ADAPTER}")
        
    except Exception as e:
        logger.error(f"❌ Error loading model: {str(e)}")
        raise

@app.get("/")
async def root():
    return {
        "message": "Cura AI Inference Server", 
        "model": "Apollo-2B with YOUR fine-tuning", 
        "status": "healthy",
        "adapter": "./model"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    if model is None or tokenizer is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    return {
        "status": "healthy", 
        "model_loaded": True,
        "model": "Apollo-2B + YOUR PEFT adapter",
        "adapter_path": "./model"
    }

@app.post("/ai/chat", response_model=ChatResponse)  # ← FIXED: Simple /chat endpoint
async def chat(request: ChatRequest):
    """Generate response using YOUR fine-tuned model"""
    global model, tokenizer
    
    if model is None or tokenizer is None:
        raise HTTPException(status_code=503, detail="Model not loaded yet")
    
    try:
        # Format prompt
        prompt = f"Question: {request.message}\nAnswer:"
        
        # Tokenize
        inputs = tokenizer(
            prompt,
            return_tensors="pt",
            truncation=True,
            max_length=512
        )
        
        # Generate using YOUR fine-tuned model
        logger.info(f"🤖 Using YOUR fine-tuned model for: {request.message[:50]}...")
        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_new_tokens=256,
                temperature=0.7,
                top_p=0.9,
                do_sample=True,
                pad_token_id=tokenizer.pad_token_id,
                eos_token_id=tokenizer.eos_token_id
            )
        
        # Decode response
        response_text = tokenizer.decode(outputs[0], skip_special_tokens=True)
        
        # Extract answer
        if "Answer:" in response_text:
            response_text = response_text.split("Answer:")[-1].strip()
        
        logger.info(f"✅ Response generated from YOUR model")
        
        return ChatResponse(reply=response_text, confidence=0.95)
        
    except Exception as e:
        logger.error(f"❌ Inference error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
