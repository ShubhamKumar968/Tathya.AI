# Fake News Detector — ML Backend

Pipeline:
1. **Grok** → FAKE / REAL label + confidence and human-readable explanation of why

---

## Setup

```bash
# 1. Clone & install
pip install -r requirements.txt

# 2. Add your API keys
cp .env.example .env
# Edit .env and add your GROQ_API_KEY

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

### `POST /classify` — Classification only
```json
Response:
{ "label": "REAL", "confidence": 0.8741 }
```

### `GET /health` — Check API status
```json
{ "status": "ok", "grok_configured": true, "model": "grok" }
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
// data.explanation → bullet points from Grok
```

---

## Deployment (Render.com — free tier)

1. Push to GitHub
2. New Web Service on Render → connect repo
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add `GROQ_API_KEY` in Environment Variables

---

## Interview talking points

- **Single-stage pipeline**: Grok handles both classification and explainability
- **Model choice**: Grok
- **Graceful degradation**: if Grok fails, an error is returned
- **Production-ready**: CORS configured, input validation via Pydantic, model loaded once at startup (not per-request)