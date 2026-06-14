/**
 * history.js — Tathya.AI History Page
 * Paginated, filterable analysis history with expandable explanations
 */

const BACKEND_BASE = "https://tathya-backend-23rh.onrender.com";

let currentPage   = 1;
let currentFilter = "ALL";
let searchTimer   = null;
const PAGE_SIZE   = 10;

async function initHistory() {
  await fetchHistory();
}

// ── Fetch + Render ───────────────────────────────────────────

async function fetchHistory() {
  const token = localStorage.getItem("token");
  if (!token) return;

  const list    = document.getElementById("historyList");
  const empty   = document.getElementById("histEmpty");
  const meta    = document.getElementById("histMeta");
  const pagination = document.getElementById("pagination");

  list.innerHTML = `<div class="hist-loading">Loading…</div>`;
  empty.style.display = "none";
  pagination.innerHTML = "";

  try {
    const params = new URLSearchParams({
      page:  currentPage,
      limit: PAGE_SIZE,
    });
    if (currentFilter !== "ALL") params.set("label", currentFilter);

    const res  = await fetch(`${BACKEND_BASE}/api/analysis/history?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    const { analyses = [], total = 0, totalPages = 1 } = data;

    // Search filter (client-side on loaded page)
    const query   = document.getElementById("histSearch").value.trim().toLowerCase();
    const visible = query
      ? analyses.filter(a => a.text.toLowerCase().includes(query) || a.explanation.toLowerCase().includes(query))
      : analyses;

    // Meta info
    meta.textContent = total === 0
      ? "No analyses found."
      : `Showing ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, total)} of ${total}`;

    if (visible.length === 0) {
      list.innerHTML = "";
      empty.style.display = "flex";
    } else {
      empty.style.display = "none";
      list.innerHTML = visible.map((item, idx) => renderHistoryCard(item, idx)).join("");
    }

    renderPagination(totalPages);

  } catch (err) {
    list.innerHTML = `<p style="color:var(--fake-text);text-align:center;padding:20px">Failed to load history: ${err.message}</p>`;
  }
}

// ── Card Template ────────────────────────────────────────────

function renderHistoryCard(item, idx) {
  const isFake  = item.label === "FAKE";
  const pct     = Math.round(item.confidence * 100);
  const date    = new Date(item.createdAt).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
  });
  const preview = item.text.length > 200 ? item.text.slice(0, 200) + "…" : item.text;
  const id      = `card-${idx}`;

  // Format bullet explanation
  const bullets = item.explanation
    ? item.explanation.split("\n").map(l => l.replace(/^[\s•\-\*\d\.]+/, "").trim()).filter(l => l.length > 2)
    : [];
  const bulletsHtml = bullets.map(b => `<li><span class="bullet-dot"></span><span>${b}</span></li>`).join("");

  return `
    <div class="hist-card" style="animation-delay:${idx * 50}ms">
      <div class="hist-card-header" onclick="toggleCard('${id}')">
        <div class="hist-card-left">
          <span class="badge ${isFake ? "badge-fake" : "badge-real"}" style="font-size:11px;padding:3px 10px;flex-shrink:0">
            ${isFake ? "⚠️ Fake" : "✅ Real"}
          </span>
          <span class="hist-card-text">${preview}</span>
        </div>
        <div class="hist-card-right">
          <span class="hist-conf-pill ${isFake ? "fake" : "real"}">${pct}%</span>
          <span class="hist-card-date">${date}</span>
          <span class="hist-expand-icon" id="${id}-icon">▼</span>
        </div>
      </div>
      <div class="hist-card-body" id="${id}" style="display:none">
        <div class="hist-full-text">"${item.text}"</div>
        ${bulletsHtml ? `<div class="explanation-title" style="margin-top:14px">AI EXPLANATION</div><ul class="bullet-list">${bulletsHtml}</ul>` : ""}
      </div>
    </div>`;
}

function toggleCard(id) {
  const body = document.getElementById(id);
  const icon = document.getElementById(`${id}-icon`);
  const isOpen = body.style.display !== "none";
  body.style.display = isOpen ? "none" : "block";
  icon.textContent = isOpen ? "▼" : "▲";
}

// ── Pagination ───────────────────────────────────────────────

function renderPagination(totalPages) {
  const el = document.getElementById("pagination");
  if (totalPages <= 1) { el.innerHTML = ""; return; }

  let html = "";

  if (currentPage > 1) {
    html += `<button class="page-btn" onclick="goPage(${currentPage - 1})">← Prev</button>`;
  }

  for (let p = 1; p <= totalPages; p++) {
    if (
      p === 1 || p === totalPages ||
      (p >= currentPage - 1 && p <= currentPage + 1)
    ) {
      html += `<button class="page-btn ${p === currentPage ? "active" : ""}" onclick="goPage(${p})">${p}</button>`;
    } else if (p === currentPage - 2 || p === currentPage + 2) {
      html += `<span class="page-ellipsis">…</span>`;
    }
  }

  if (currentPage < totalPages) {
    html += `<button class="page-btn" onclick="goPage(${currentPage + 1})">Next →</button>`;
  }

  el.innerHTML = html;
}

function goPage(p) {
  currentPage = p;
  fetchHistory();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ── Filters + Search ─────────────────────────────────────────

function setFilter(f) {
  currentFilter = f;
  currentPage   = 1;

  // Update tabs
  ["ALL", "FAKE", "REAL"].forEach(k => {
    document.getElementById(`tab${k[0] + k.slice(1).toLowerCase()}`).classList.toggle("active", k === f);
  });

  fetchHistory();
}

function handleSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    currentPage = 1;
    fetchHistory();
  }, 350);
}
