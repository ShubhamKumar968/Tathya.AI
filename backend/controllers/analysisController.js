const axios = require("axios");
const Analysis = require("../model/analysisModel");

// POST /api/analysis/analyze
const analyzeText = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || text.trim().length < 50)
      return res.status(400).json({ message: "Text must be at least 50 characters" });

    // Call FastAPI ML model
    const mlResponse = await axios.post(
      `${process.env.ML_API_URL}/analyze`,
      { text },
      { timeout: 60000 }
    );
    const { label, confidence, explanation } = mlResponse.data;

    // Save to MongoDB
    const analysis = await Analysis.create({
      user: req.user._id,
      text,
      label,
      confidence,
      explanation,
    });

    res.status(201).json({ label, confidence, explanation, id: analysis._id });
  } catch (error) {
    console.error("ANALYZE ERROR:", error.message); // ← added
    if (error.code === "ECONNREFUSED")
      return res.status(503).json({ message: "ML service unavailable." });
    if (error.code === "ECONNABORTED")
      return res.status(504).json({ message: "ML service timed out. Try again in 30 seconds." });
    res.status(500).json({ message: error.message });
  }
};

// GET /api/analysis/history
const getHistory = async (req, res) => {
  try {
    const analyses = await Analysis.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .select("text label confidence createdAt");

    res.json(analyses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { analyzeText, getHistory };