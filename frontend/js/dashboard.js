/**
 * dashboard.js — Tathya.AI Dashboard
 * Fetches stats from backend and renders Chart.js donut + bar charts + recent list
 */

const BACKEND_BASE = "https://tathya-backend-23rh.onrender.com";

let donutChart = null;
let barChart   = null;

async function loadDashboard() {
  const token = localStorage.getItem("token");
  if (!token) return;

  try {
    // Parallel fetch: stats + recent history
    const [statsRes, histRes] = await Promise.all([
      fetch(`${BACKEND_BASE}/api/analysis/stats`,         { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${BACKEND_BASE}/api/analysis/history?limit=5`, { headers: { Authorization: `Bearer ${token}` } }),
    ]);

    const stats = await statsRes.json();
    const hist  = await histRes.json();

    if (!statsRes.ok || !histRes.ok) throw new Error("Failed to load data");

    if (stats.total === 0) {
      // No data yet — show empty state, hide charts
      document.getElementById("dashEmpty").style.display = "flex";
      document.getElementById("chartsRow").style.display  = "none";
      document.getElementById("recentSection").style.display = "none";
      renderStatCards({ total: 0, fakeCount: 0, realCount: 0, avgConfidence: 0 });
      return;
    }

    renderStatCards(stats);
    renderDonutChart(stats);
    renderBarChart(stats.dailyAgg);
    renderRecent(hist.analyses || []);

  } catch (err) {
    console.error("[Dashboard] Error:", err.message);
  }
}

// ── Stat Cards ─────────────────────────────────────────────

function renderStatCards({ total, fakeCount, realCount, avgConfidence }) {
  animateCounter("statTotal", total);
  animateCounter("statFake",  fakeCount);
  animateCounter("statReal",  realCount);
  // Confidence with % sign
  const confEl = document.getElementById("statConf");
  animateCounter("statConf", avgConfidence, "%");
}

function animateCounter(id, target, suffix = "") {
  const el = document.getElementById(id);
  if (!el) return;
  let current = 0;
  const step  = Math.max(1, Math.ceil(target / 40));
  const timer = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = current + suffix;
    if (current >= target) clearInterval(timer);
  }, 30);
}

// ── Donut Chart ─────────────────────────────────────────────

function renderDonutChart({ fakeCount, realCount }) {
  const ctx = document.getElementById("donutChart").getContext("2d");

  const isDark  = document.documentElement.getAttribute("data-theme") === "dark";
  const textClr = isDark ? "#e2e8f0" : "#1e293b";

  if (donutChart) donutChart.destroy();

  donutChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Fake", "Real"],
      datasets: [{
        data: [fakeCount, realCount],
        backgroundColor: ["#ef4444", "#22c55e"],
        borderColor:     ["#dc2626", "#16a34a"],
        borderWidth: 2,
        hoverOffset: 8,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "68%",
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.label}: ${ctx.raw} (${Math.round(ctx.raw / (fakeCount + realCount) * 100)}%)`
          }
        }
      },
      animation: { animateRotate: true, duration: 900 },
    },
  });

  // Custom legend
  const total = fakeCount + realCount;
  document.getElementById("donutLegend").innerHTML = `
    <div class="legend-item">
      <span class="legend-dot" style="background:#ef4444"></span>
      Fake — ${fakeCount} (${total ? Math.round(fakeCount/total*100) : 0}%)
    </div>
    <div class="legend-item">
      <span class="legend-dot" style="background:#22c55e"></span>
      Real — ${realCount} (${total ? Math.round(realCount/total*100) : 0}%)
    </div>
  `;
}

// ── Bar Chart ────────────────────────────────────────────────

function renderBarChart(dailyAgg) {
  const ctx = document.getElementById("barChart").getContext("2d");

  // Build last-7-days labels
  const labels = [];
  const fakeData = [];
  const realData = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key  = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    labels.push(label);

    const found = (dailyAgg || []).find(x => x._id === key);
    fakeData.push(found ? found.fakeCount : 0);
    realData.push(found ? found.realCount : 0);
  }

  if (barChart) barChart.destroy();

  barChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Fake",
          data: fakeData,
          backgroundColor: "rgba(239,68,68,0.75)",
          borderColor: "#ef4444",
          borderWidth: 1,
          borderRadius: 6,
        },
        {
          label: "Real",
          data: realData,
          backgroundColor: "rgba(34,197,94,0.75)",
          borderColor: "#22c55e",
          borderWidth: 1,
          borderRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: getComputedStyle(document.documentElement).getPropertyValue("--text-primary").trim() || "#1e293b",
            font: { size: 12 }
          }
        },
      },
      scales: {
        x: {
          stacked: true,
          ticks: {
            color: getComputedStyle(document.documentElement).getPropertyValue("--text-muted").trim() || "#64748b",
          },
          grid: { display: false },
        },
        y: {
          stacked: true,
          beginAtZero: true,
          ticks: {
            precision: 0,
            color: getComputedStyle(document.documentElement).getPropertyValue("--text-muted").trim() || "#64748b",
          },
          grid: { color: "rgba(100,116,139,0.15)" },
        },
      },
      animation: { duration: 800 },
    },
  });
}

// ── Recent List ──────────────────────────────────────────────

function renderRecent(items) {
  const list = document.getElementById("recentList");
  if (!items || items.length === 0) {
    list.innerHTML = `<p style="color:var(--text-muted);text-align:center;padding:20px">No recent analyses.</p>`;
    return;
  }

  list.innerHTML = items.map((item) => {
    const isFake = item.label === "FAKE";
    const date   = new Date(item.createdAt).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" });
    const preview = item.text.length > 120 ? item.text.slice(0, 120) + "…" : item.text;
    return `
      <div class="history-item">
        <span class="history-text" title="${item.text}">${preview}</span>
        <div class="history-meta">
          <span class="badge ${isFake ? "badge-fake" : "badge-real"}" style="font-size:11px;padding:3px 10px">
            ${isFake ? "⚠️ Fake" : "✅ Real"}
          </span>
          <span class="history-conf">${Math.round(item.confidence * 100)}%</span>
          <span class="history-date">${date}</span>
        </div>
      </div>`;
  }).join("");
}
