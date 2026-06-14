from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv
import os

from classifier import classify_text
from explainer import explain

# Load from root-level .env (one file for the entire project)
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))


app = FastAPI(
    title="Fake News Detector API",
    description="Detects fake news using HuggingFace + Gemini",
    version="1.0.0"
)

# Allow all origins during dev — restrict in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- Request / Response Schemas ----------

class AnalyzeRequest(BaseModel):
    text: str = Field(..., min_length=50, max_length=5000, description="Article or news text to analyze")


class AnalyzeResponse(BaseModel):
    label: str           # "FAKE" or "REAL"
    confidence: float    # 0.0 to 1.0
    explanation: str     # Gemini-generated analysis


class ClassifyOnlyResponse(BaseModel):
    label: str
    confidence: float


# ---------- Endpoints ----------

@app.get("/")
def root():
    return {"status": "ok", "message": "Fake News Detector API is running"}


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(req: AnalyzeRequest):
    """
    Full pipeline: HuggingFace classification + Gemini explanation.
    Use this as your main endpoint.
    """
    try:
        result = classify_text(req.text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Classification failed: {str(e)}")

    try:
        explanation = explain(req.text, result["label"], result["confidence"])
    except Exception as e:
        # Don't fail the whole request if Gemini is down — return without explanation
        explanation = f"Explanation unavailable: {str(e)}"

    return AnalyzeResponse(
        label=result["label"],
        confidence=result["confidence"],
        explanation=explanation
    )


@app.post("/classify", response_model=ClassifyOnlyResponse)
def classify_only(req: AnalyzeRequest):
    """
    HuggingFace classification only — no Gemini call.
    Faster, use for testing or if Gemini key is not set.
    """
    try:
        result = classify_text(req.text)
        return ClassifyOnlyResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Classification failed: {str(e)}")


@app.get("/health")
def health():
    gemini_key_set = bool(os.getenv("GEMINI_API_KEY"))
    return {
        "status": "ok",
        "gemini_configured": gemini_key_set,
        "hf_model": os.getenv("HF_MODEL", "hamzab/roberta-fake-news-classification")
    }