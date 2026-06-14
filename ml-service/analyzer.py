"""
analyzer.py — Tathya.AI
Single Gemini call for classification + explanation (no HuggingFace needed).
"""

import google.generativeai as genai
import os
import json
import re
from dotenv import load_dotenv

# Load from root-level .env (works locally; on Render, env vars are set directly)
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

_model = None


def _get_model():
    global _model
    if _model is None:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError(
                "GEMINI_API_KEY is not set. Add it to your .env file or Render environment variables."
            )
        genai.configure(api_key=api_key)
        _model = genai.GenerativeModel("gemini-1.5-flash")
    return _model


def analyze_article(text: str) -> dict:
    """
    Single Gemini API call that returns:
    - label:       "FAKE" or "REAL"
    - confidence:  float between 0.55 and 0.99
    - explanation: bullet-point string explaining the classification
    """
    model = _get_model()

    prompt = f"""You are an expert fact-checker and misinformation analyst.

Analyze the following news article or text for authenticity. Evaluate based on:
- Language style (sensational, emotional, clickbait vs neutral, factual)
- Source attribution (named sources, official data, studies vs anonymous or none)
- Verifiable claims vs vague or unverifiable assertions
- Known misinformation patterns (conspiracy framing, health scams, political manipulation)

Article text:
\"\"\"
{text[:2000]}
\"\"\"

Respond with ONLY a valid JSON object — no markdown, no code fences, no extra text:
{{
  "label": "FAKE",
  "confidence": 0.91,
  "bullets": [
    "Key observation 1 about why this is fake/real",
    "Key observation 2 about language or source credibility",
    "Key observation 3 about specific claims or framing",
    "Brief recommendation for the reader"
  ]
}}

Strict rules:
- label must be exactly "FAKE" or "REAL" (uppercase)
- confidence must be between 0.55 and 0.99 (be honest about uncertainty)
- bullets must have 3–5 items, each a complete sentence
- Output ONLY the JSON object, nothing else"""

    response = model.generate_content(prompt)
    raw = response.text.strip()

    # Strip markdown code fences if Gemini wraps the response
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    raw = raw.strip()

    # Extract the JSON object
    json_match = re.search(r"\{.*\}", raw, re.DOTALL)
    if not json_match:
        raise RuntimeError(
            f"Gemini did not return valid JSON. Raw response: {raw[:300]}"
        )

    result = json.loads(json_match.group())

    # Validate label
    label = str(result.get("label", "")).strip().upper()
    if label not in ("FAKE", "REAL"):
        raise RuntimeError(f"Gemini returned an unexpected label: '{label}'")

    # Clamp confidence to a safe range
    confidence = float(result.get("confidence", 0.75))
    confidence = round(max(0.55, min(0.99, confidence)), 4)

    # Build bullet-point explanation string
    bullets = result.get("bullets", [])
    if not bullets:
        raise RuntimeError("Gemini returned no explanation bullets.")
    explanation = "\n".join(f"• {b.strip()}" for b in bullets if b.strip())

    return {
        "label": label,
        "confidence": confidence,
        "explanation": explanation,
    }
