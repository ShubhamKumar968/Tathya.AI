/**
 * detector.js — Core logic for the fake news detector page
 * Handles: analyze button, result rendering, history loading
 */

// Dynamically uses the same host+port the page was served from
const BACKEND_BASE = window.location.origin;

// ──────────────────────────────────────────
// Analyze
// ──────────────────────────────────────────

async function handleAnalyze() {
  const textEl = document.getElementById("newsText");
  const btn = document.getElementById("analyzeBtn");
  const btnText = document.getElementById("btnText");
  const spinner = document.getElementById("spinner");
  const resultCard = document.getElementById("resultCard");
  const token = localStorage.getItem("token");

  const text = textEl.value.trim();

  // Validate
  if (text.length < 50) {
    showToast("Please enter at least 50 characters before analyzing.", "error");
    textEl.focus();
    return;
  }

  // Loading state
  btn.disabled = true;
  spinner.style.display = "block";
  btnText.textContent = "Analyzing…";
  resultCard.classList.remove("show");

  try {
    const res = await fetch(`${BACKEND_BASE}/api/analysis/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ text }),
    });

    const data = await res.json();

    if (!res.ok) {
      showToast(data.message || "Analysis failed. Please try again.", "error");
      return;
    }

    displayResult(data);
    loadHistory(); // Refresh history after new analysis
  } catch (err) {
    showToast(
      "Network error. Make sure the backend (port 5000) and ML service (port 8000) are running.",
      "error"
    );
  } finally {
    btn.disabled = false;
    spinner.style.display = "none";
    btnText.textContent = "🔍 Analyze";
  }
}

// ──────────────────────────────────────────
// Display result
// ──────────────────────────────────────────

function displayResult(data) {
  const { label, confidence, explanation } = data;

  const resultCard = document.getElementById("resultCard");
  const badge = document.getElementById("resultBadge");
  const confBar = document.getElementById("confBar");
  const confValue = document.getElementById("confValue");
  const bulletList = document.getElementById("bulletList");

  // Badge
  const isFake = label === "FAKE";
  badge.className = `badge ${isFake ? "badge-fake" : "badge-real"}`;
  badge.textContent = isFake ? "⚠️ Likely Fake" : "✅ Likely Real";

  // Confidence bar (animate after short delay so CSS transition fires)
  const pct = Math.round(confidence * 100);
  confBar.className = `conf-bar ${isFake ? "fake" : "real"}`;
  confBar.style.width = "0%";
  setTimeout(() => {
    confBar.style.width = `${pct}%`;
  }, 80);
  confValue.textContent = `${pct}% confidence`;

  // Parse Gemini bullet points — handles •, -, *, and numbered lists
  bulletList.innerHTML = "";
  const lines = explanation
    .split("\n")
    .map((l) => l.replace(/^[\s•\-\*\d\.]+/, "").trim())
    .filter((l) => l.length > 2); // drop empty / very short fragments

  if (lines.length === 0) {
    // Fallback: show raw explanation in a single item
    const li = document.createElement("li");
    li.innerHTML = `<span class="bullet-dot"></span><span>${explanation}</span>`;
    bulletList.appendChild(li);
  } else {
    lines.forEach((line) => {
      const li = document.createElement("li");
      li.innerHTML = `<span class="bullet-dot"></span><span>${line}</span>`;
      bulletList.appendChild(li);
    });
  }

  // Show card with smooth scroll
  resultCard.classList.add("show");
  setTimeout(() => {
    resultCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, 100);
}

// ──────────────────────────────────────────
// History
// ──────────────────────────────────────────

async function loadHistory() {
  const token = localStorage.getItem("token");
  const historySection = document.getElementById("historySection");
  const historyList = document.getElementById("historyList");

  if (!token) return;

  try {
    const res = await fetch(`${BACKEND_BASE}/api/analysis/history`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) return;

    const items = await res.json();

    if (!items || items.length === 0) {
      historySection.style.display = "none";
      return;
    }

    historySection.style.display = "block";
    historyList.innerHTML = "";

    items.forEach((item, idx) => {
      const date = new Date(item.createdAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

      const isFake = item.label === "FAKE";
      const div = document.createElement("div");
      div.className = "history-item";
      div.style.animationDelay = `${idx * 60}ms`;

      div.innerHTML = `
        <span class="history-text" title="${item.text}">${item.text}</span>
        <div class="history-meta">
          <span class="badge ${isFake ? "badge-fake" : "badge-real"}" style="font-size:11px;padding:3px 10px;">
            ${isFake ? "⚠️ Fake" : "✅ Real"}
          </span>
          <span class="history-conf">${Math.round(item.confidence * 100)}%</span>
          <span class="history-date">${date}</span>
        </div>
      `;

      historyList.appendChild(div);
    });
  } catch (err) {
    // History is non-critical — silently fail so it doesn't block main UI
  }
}

// ──────────────────────────────────────────
// Toast notification (replaces alert())
// ──────────────────────────────────────────

function showToast(message, type = "info") {
  // Remove existing toast if any
  const existing = document.getElementById("toastMsg");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.id = "toastMsg";
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  // Trigger show animation
  requestAnimationFrame(() => toast.classList.add("toast-show"));

  // Auto-hide after 4s
  setTimeout(() => {
    toast.classList.remove("toast-show");
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
