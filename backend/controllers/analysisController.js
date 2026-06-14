const axios = require("axios");
const Analysis = require("../model/analysisModel");

// POST /api/analysis/analyze
const analyzeText = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || text.trim().length < 50)
      return res.status(400).json({ message: "Text must be at least 50 characters" });

    // Guard: make sure ML_API_URL is configured
    if (!process.env.ML_API_URL) {
      console.error("ANALYZE ERROR: ML_API_URL environment variable is not set!");
      return res.status(503).json({ message: "ML service URL is not configured. Set ML_API_URL in environment variables." });
    }

    console.log(`[ANALYZE] Calling ML service at: ${process.env.ML_API_URL}/analyze`);

    let mlResponse;
    try {
      mlResponse = await axios.post(
        `${process.env.ML_API_URL}/analyze`,
        { text },
        { timeout: 120000 } // 2 min — ML service may be waking up on free tier
      );
    } catch (mlError) {
      // Log the full ML service error so it shows in Render logs
      if (mlError.response) {
        // ML service responded with an error status
        console.error(`[ANALYZE] ML service responded with ${mlError.response.status}:`, JSON.stringify(mlError.response.data));
        return res.status(502).json({
          message: `ML service error (${mlError.response.status}): ${JSON.stringify(mlError.response.data)}`
        });
      } else if (mlError.code === "ECONNREFUSED") {
        console.error("[ANALYZE] ML service is not running (ECONNREFUSED)");
        return res.status(503).json({ message: "ML service is not running. Deploy tathya-ml-api on Render." });
      } else if (mlError.code === "ECONNABORTED" || mlError.code === "ETIMEDOUT") {
        console.error("[ANALYZE] ML service timed out");
        return res.status(504).json({ message: "ML service timed out. It may be waking up — try again in 30 seconds." });
      } else {
        console.error("[ANALYZE] ML service network error:", mlError.message);
        return res.status(503).json({ message: `Could not reach ML service: ${mlError.message}` });
      }
    }

    const { label, confidence, explanation } = mlResponse.data;
    console.log(`[ANALYZE] Result: ${label} (${Math.round(confidence * 100)}%)`);

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
    console.error("[ANALYZE] Unexpected error:", error.message);
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