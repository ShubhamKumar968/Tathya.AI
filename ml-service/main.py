from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv
import os
import traceback

from analyzer import analyze_article

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

app = FastAPI(
    title="Tathya.AI ML API",
    description="Fake news detection powered by Groq (Llama 3.1 8B)",
    version="3.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnalyzeRequest(BaseModel):
    text: str = Field(..., min_length=50, max_length=5000)

class AnalyzeResponse(BaseModel):
    label: str
    confidence: float
    explanation: str


@app.get("/")
def root():
    return {"status": "ok", "message": "Tathya.AI ML API", "engine": "Groq / Llama-3.1-8b"}


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(req: AnalyzeRequest):
    try:
        print(f"[ANALYZE] Received text ({len(req.text)} chars). Calling Groq...")
        result = analyze_article(req.text)
        print(f"[ANALYZE] Success → {result['label']} ({round(result['confidence']*100)}%)")
        return AnalyzeResponse(**result)
    except Exception as e:
        print(f"[ANALYZE ERROR] {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@app.get("/health")
def health():
    groq_key = os.getenv("GROQ_API_KEY", "")
    return {
        "status": "ok",
        "groq_configured": bool(groq_key),
        "engine": "llama-3.1-8b-instant",
        "provider": "Groq (free tier)",
    }