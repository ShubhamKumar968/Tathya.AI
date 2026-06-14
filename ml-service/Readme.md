# Fake News Detector — ML Backend

Two-stage pipeline:
1. **HuggingFace** (`roberta-fake-news-classification`) → FAKE / REAL label + confidence
2. **Gemini 1.5 Flash** → Human-readable explanation of why

---

## Setup

```bash
# 1. Clone & install
pip install -r requirements.txt

# 2. Add your API keys
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY

# 3. Run
uvicorn main:app --reload
```

API runs at: `http://localhost:8000`

---

## Endpoints

### `POST /analyze` — Full pipeline (use this in frontend)
```json
Request:
{ "text": "paste your article text here..." }

Response:
{
  "label": "FAKE",
  "confidence": 0.9312,
  "explanation": "• Sensational headline with no attributed sources\n• ..."
}
```

### `POST /classify` — HuggingFace only (no Gemini)
```json
Response:
{ "label": "REAL", "confidence": 0.8741 }
```

### `GET /health` — Check API status
```json
{ "status": "ok", "gemini_configured": true, "hf_model": "hamzab/roberta-fake-news-classification" }
```

---

## Frontend Integration (any framework)

```javascript
const response = await fetch("http://localhost:8000/analyze", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ text: articleText })
});
const data = await response.json();
// data.label → "FAKE" or "REAL"
// data.confidence → 0.93 (show as percentage)
// data.explanation → bullet points from Gemini
```

---

## Deployment (Render.com — free tier)

1. Push to GitHub
2. New Web Service on Render → connect repo
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add `GEMINI_API_KEY` in Environment Variables

---

## Interview talking points

- **Two-stage pipeline**: fine-tuned transformer for classification + LLM for explainability
- **Model choice**: RoBERTa-based, trained on LIAR + FakeNewsNet datasets
- **Graceful degradation**: if Gemini fails, classification still returns (try/except in main.py)
- **Production-ready**: CORS configured, input validation via Pydantic, model loaded once at startup (not per-request)