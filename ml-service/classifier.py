import os
import requests
from dotenv import load_dotenv

# Load from the root-level .env (parent of ML Model folder)
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

HF_MODEL = os.getenv("HF_MODEL", "hamzab/roberta-fake-news-classification")
HF_API_URL = f"https://api-inference.huggingface.co/models/{HF_MODEL}"
HF_API_TOKEN = os.getenv("HF_API_TOKEN")


def classify_text(text: str) -> dict:
    """
    Calls HuggingFace Inference API to classify text as FAKE or REAL.
    Handles model-loading state and unexpected API errors gracefully.
    """
    if not HF_API_TOKEN:
        raise ValueError("HF_API_TOKEN is not set in your .env file.")

    headers = {"Authorization": f"Bearer {HF_API_TOKEN}"}

    response = requests.post(
        HF_API_URL,
        headers=headers,
        json={"inputs": text[:512]},
        timeout=30,
    )

    if response.status_code != 200:
        raise RuntimeError(
            f"HuggingFace API returned HTTP {response.status_code}: {response.text}"
        )

    raw = response.json()

    # When the model is still loading, HF returns: {"error": "...", "estimated_time": N}
    if isinstance(raw, dict) and "error" in raw:
        est = raw.get("estimated_time", "unknown")
        raise RuntimeError(
            f"HuggingFace model is loading (estimated wait: {est}s). "
            "Please try again in a moment."
        )

    # Expected: [[{"label": "LABEL_0", "score": 0.93}, ...]]
    if not isinstance(raw, list) or not raw or not isinstance(raw[0], list):
        raise RuntimeError(f"Unexpected HuggingFace response format: {raw}")

    # Pick the highest-confidence prediction
    predictions = raw[0]
    best = max(predictions, key=lambda x: x["score"])

    label = best["label"].upper()
    confidence = round(best["score"], 4)

    # Normalize label names (model uses LABEL_0 / LABEL_1)
    if label in ("LABEL_0", "0", "FAKE"):
        label = "FAKE"
    elif label in ("LABEL_1", "1", "REAL"):
        label = "REAL"
    else:
        # Keep whatever label the model returns rather than silently crashing
        label = label

    return {"label": label, "confidence": confidence}