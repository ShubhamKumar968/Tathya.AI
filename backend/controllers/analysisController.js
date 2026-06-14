const axios = require("axios");
const Analysis = require("../model/analysisModel");

// POST /api/analysis/analyze
const analyzeText = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || text.trim().length < 50)
      return res.status(400).json({ message: "Text must be at least 50 characters" });

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
        { timeout: 120000 }
      );
    } catch (mlError) {
      if (mlError.response) {
        console.error(`[ANALYZE] ML service responded with ${mlError.response.status}:`, JSON.stringify(mlError.response.data));
        return res.status(502).json({
          message: `ML service error (${mlError.response.status}): ${JSON.stringify(mlError.response.data)}`
        });
      } else if (mlError.code === "ECONNREFUSED") {
        return res.status(503).json({ message: "ML service is not running." });
      } else if (mlError.code === "ECONNABORTED" || mlError.code === "ETIMEDOUT") {
        return res.status(504).json({ message: "ML service timed out. Try again in 30 seconds." });
      } else {
        return res.status(503).json({ message: `Could not reach ML service: ${mlError.message}` });
      }
    }

    const { label, confidence, explanation } = mlResponse.data;
    console.log(`[ANALYZE] Result: ${label} (${Math.round(confidence * 100)}%)`);

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

// GET /api/analysis/history?page=1&limit=10&label=FAKE
const getHistory = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 10);
    const label = req.query.label;

    const filter = { user: req.user._id };
    if (label && ["FAKE", "REAL"].includes(label.toUpperCase())) {
      filter.label = label.toUpperCase();
    }

    const total    = await Analysis.countDocuments(filter);
    const analyses = await Analysis.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select("text label confidence explanation createdAt");

    res.json({
      analyses,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/analysis/stats
const getStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const [total, fakeCount, realCount, confAgg, dailyAgg] = await Promise.all([
      Analysis.countDocuments({ user: userId }),
      Analysis.countDocuments({ user: userId, label: "FAKE" }),
      Analysis.countDocuments({ user: userId, label: "REAL" }),

      // Average confidence
      Analysis.aggregate([
        { $match: { user: userId } },
        { $group: { _id: null, avg: { $avg: "$confidence" } } },
      ]),

      // Last 7 days breakdown
      Analysis.aggregate([
        {
          $match: {
            user: userId,
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            total:     { $sum: 1 },
            fakeCount: { $sum: { $cond: [{ $eq: ["$label", "FAKE"] }, 1, 0] } },
            realCount: { $sum: { $cond: [{ $eq: ["$label", "REAL"] }, 1, 0] } },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const avgConfidence = confAgg.length ? Math.round(confAgg[0].avg * 100) : 0;

    res.json({ total, fakeCount, realCount, avgConfidence, dailyAgg });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { analyzeText, getHistory, getStats };