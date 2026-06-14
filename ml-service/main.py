from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv
import os
import traceback

from analyzer import analyze_article

# Load from root-level .env (locally); on Render, env vars are set in dashboard
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

app = FastAPI(
    title="Tathya.AI ML API",
    description="Fake news detection powered entirely by Google Gemini 1.5 Flash",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- Schemas ----------

class AnalyzeRequest(BaseModel):
    text: str = Field(..., min_length=50, max_length=5000,
                      description="News article or text to analyze")

class AnalyzeResponse(BaseModel):
    label: str
    confidence: float
    explanation: str


# ---------- Endpoints ----------

@app.get("/")
def root():
    return {
        "status": "ok",
        "message": "Tathya.AI ML API is running",
        "engine": "Google Gemini 1.5 Flash"
    }


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(req: AnalyzeRequest):
    try:
        print(f"[ANALYZE] Received text ({len(req.text)} chars). Calling Gemini...")
        result = analyze_article(req.text)
        print(f"[ANALYZE] Success → label={result['label']}, confidence={result['confidence']}")
        return AnalyzeResponse(**result)
    except Exception as e:
        # Print FULL traceback so it appears in Render logs
        print(f"[ANALYZE ERROR] {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@app.get("/health")
def health():
    gemini_key = os.getenv("GEMINI_API_KEY", "")
    return {
        "status": "ok",
        "gemini_configured": bool(gemini_key),
        "gemini_key_prefix": gemini_key[:8] + "..." if gemini_key else "NOT SET",
        "engine": "gemini-2.0-flash",
        "sdk": "google-genai (v1 API)",
    }