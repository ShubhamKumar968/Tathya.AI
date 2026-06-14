"""
analyzer.py — Tathya.AI
Uses Groq API (free tier) with Llama 3.1 for fake news classification + explanation.
No credit card required. Free: 14,400 requests/day, 30 req/min.
"""

from groq import Groq
import os
import json
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

_client = None


def _get_client():
    global _client
    if _client is None:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError(
                "GROQ_API_KEY is not set. Get a free key from https://console.groq.com "
                "and add it to your Render environment variables."
            )
        _client = Groq(api_key=api_key)
    return _client


def analyze_article(text: str) -> dict:
    """
    Uses Groq (Llama 3.1) to classify + explain in one call.
    Returns: {"label": "FAKE"|"REAL", "confidence": float, "explanation": str}
    """
    client = _get_client()

    system_prompt = """You are an expert fact-checker and misinformation analyst. 
You always respond with valid JSON only — no markdown, no extra text."""

    user_prompt = f"""Analyze this news article for authenticity. Evaluate:
- Language style (sensational/emotional vs neutral/factual)
- Source attribution (named sources, studies, data vs anonymous/none)
- Verifiable claims vs vague/unverifiable assertions  
- Known misinformation patterns (conspiracy framing, health scams, political manipulation)

Article:
\"\"\"{text[:2000]}\"\"\"

Respond with ONLY this JSON structure:
{{
  "label": "FAKE",
  "confidence": 0.91,
  "bullets": [
    "Observation 1 explaining classification",
    "Observation 2 about language/sources",
    "Observation 3 about specific claims",
    "Recommendation for the reader"
  ]
}}

Rules: label = "FAKE" or "REAL" exactly. confidence = 0.55 to 0.99. 3-5 bullets."""

    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": user_prompt},
        ],
        response_format={"type": "json_object"},  # Guaranteed valid JSON
        temperature=0.3,
        max_tokens=800,
    )

    result = json.loads(response.choices[0].message.content)

    # Validate label
    label = str(result.get("label", "")).strip().upper()
    if label not in ("FAKE", "REAL"):
        raise RuntimeError(f"Model returned unexpected label: '{label}'")

    # Clamp confidence
    confidence = float(result.get("confidence", 0.75))
    confidence = round(max(0.55, min(0.99, confidence)), 4)

    # Build explanation
    bullets = result.get("bullets", [])
    if not bullets:
        raise RuntimeError("Model returned no explanation bullets.")
    explanation = "\n".join(f"• {b.strip()}" for b in bullets if b.strip())

    return {
        "label": label,
        "confidence": confidence,
        "explanation": explanation,
    }
