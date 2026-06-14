const express = require("express");
const cors    = require("cors");
const dotenv  = require("dotenv");
const path    = require("path");
const connectDB = require("./config/db");

// Load from root-level .env (one file for the whole project)
dotenv.config({ path: path.join(__dirname, "../.env") });

connectDB();

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());

// ── Serve frontend static files ──────────────────────────────
const frontendPath = path.join(__dirname, "../frontend");
app.use(express.static(frontendPath));

// Root → Landing page
app.get("/", (req, res) => {
  res.redirect("/pages/index.html");
});

// ── API Routes ───────────────────────────────────────────────
app.use("/api/auth",     require("./routes/authRoutes"));
app.use("/api/analysis", require("./routes/analysisRoutes"));

// ── 404 fallback ─────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`  🚀  Server successfully running on address http://localhost:${PORT}`);
  console.log(`  🌐  Open Tathya.AI  →  http://localhost:${PORT}/pages/index.html`);
  console.log("");
});