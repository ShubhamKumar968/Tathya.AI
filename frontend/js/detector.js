/**
 * detector.js — Core logic for the fake news detector page
 * Handles: analyze button, result rendering, history loading, ML API status
 */

const BACKEND_BASE = "https://tathya-backend-23rh.onrender.com";
const ML_BASE = "https://tathya-ai.onrender.com";

// ──────────────────────────────────────────
// ML API Status Checker
// ──────────────────────────────────────────

async function checkMLStatus() {
  const dot = document.getElementById("apiDot");
  const text = document.getElementById("apiStatusText");
  const wakeBtn = document.getElementById("wakeBtn");

  dot.className = "api-dot checking";
  text.textContent = "Checking ML API...";
  wakeBtn.style.display = "none";

  try {
    const res = await fetch(`${ML_BASE}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      dot.className = "api-dot online";
      text.textContent = "ML API Online";
      wakeBtn.style.display = "none";
    } else {
      throw new Error("not ok");
    }
  } catch {
    dot.className = "api-dot offline";
    text.textContent = "ML API Offline";
    wakeBtn.style.display = "inline-block";
  }
}

async function wakeUpML() {
  const dot = document.getElementById("apiDot");
  const text = document.getElementById("apiStatusText");
  const wakeBtn = document.getElementById("wakeBtn");

  dot.className = "api-dot checking";
  text.textContent = "Waking up ML API... (30-60 sec)";
  wakeBtn.disabled = true;
  wakeBtn.textContent = "Waking up...";

  try {
    const res = await fetch(`${ML_BASE}/health`, {
      signal: AbortSignal.timeout(60000),
    });
    if (res.ok) {
      dot.className = "api-dot online";
      text.textContent = "ML API Online ✅";
      wakeBtn.style.display = "none";
    } else {
      throw new Error("not ok");
    }
  } catch {
    dot.className = "api-dot offline";
    text.textContent = "ML API still offline — try again";
    wakeBtn.disabled = false;
    wakeBtn.textContent = "⚡ Wake Up API";
  }
}

// Check on page load
checkMLStatus();

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
    loadHistory();
    checkMLStatus(); // Refresh status after analyze
  } catch (err) {
    showToast("Network error. Please try again.", "error");
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

  // Confidence bar
  const pct = Math.round(confidence * 100);
  confBar.className = `conf-bar ${isFake ? "fake" : "real"}`;
  confBar.style.width = "0%";
  setTimeout(() => {
    confBar.style.width = `${pct}%`;
  }, 80);
  confValue.textContent = `${pct}% confidence`;

  // Parse Grok bullet points
  bulletList.innerHTML = "";
  const lines = explanation
    .split("\n")
    .map((l) => l.replace(/^[\s•\-\*\d\.]+/, "").trim())
    .filter((l) => l.length > 2);

  if (lines.length === 0) {
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

  // Show card
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

    const data  = await res.json();
    const items = data.analyses || [];

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
    // History is non-critical — silently fail
  }
}

// ──────────────────────────────────────────
// Toast notification
// ──────────────────────────────────────────

function showToast(message, type = "info") {
  const existing = document.getElementById("toastMsg");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.id = "toastMsg";
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add("toast-show"));

  setTimeout(() => {
    toast.classList.remove("toast-show");
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}