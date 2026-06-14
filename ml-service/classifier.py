import google.generativeai as genai
import os

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
_model = None

def get_model():
    global _model
    if _model is None:
        _model = genai.GenerativeModel("gemini-1.5-flash")
    return _model

def classify_text(text: str) -> dict:
    model = get_model()
    
    prompt = f"""Analyze this news text and classify it as FAKE or REAL.

Text: "{text[:1000]}"

Respond ONLY in this exact JSON format, nothing else:
{{"label": "FAKE", "confidence": 0.87}}

Rules:
- label must be exactly "FAKE" or "REAL"
- confidence must be between 0.0 and 1.0"""

    response = model.generate_content(prompt)
    
    import json
    text_response = response.text.strip()
    # Clean markdown if present
    text_response = text_response.replace("```json", "").replace("```", "").strip()
    result = json.loads(text_response)
    
    return {
        "label": result["label"].upper(),
        "confidence": round(float(result["confidence"]), 4)
    }