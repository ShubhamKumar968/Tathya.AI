import google.generativeai as genai
import os
from dotenv import load_dotenv

# Load from root-level .env
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))


_model = None

def get_model():
    global _model
    if _model is None:
        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
        _model = genai.GenerativeModel("gemini-1.5-flash")
    return _model


def explain(text: str, label: str, confidence: float) -> str:
    """
    Uses Gemini to generate a human-readable explanation
    for why the article was classified as FAKE or REAL.
    """
    model = get_model()

    confidence_pct = round(confidence * 100, 1)

    prompt = f"""
You are a fact-checking assistant. A news article has been analyzed by an AI classifier.

Classification result: {label} (confidence: {confidence_pct}%)

Article text:
\"\"\"
{text[:1500]}
\"\"\"

Based on the article text and classification result, provide a concise analysis (3-5 bullet points) covering:
- Key indicators that support the classification (sensational language, lack of sources, emotional tone, factual claims, etc.)
- Credibility signals (author attribution, specific data, named sources)
- A brief recommendation on whether the reader should verify this further

Keep your response short, clear, and neutral. Do not repeat the article. Format as bullet points only.
"""

    response = model.generate_content(prompt)
    return response.text.strip()