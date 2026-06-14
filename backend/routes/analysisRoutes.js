const express = require("express");
const router = express.Router();
const { analyzeText, getHistory } = require("../controllers/analysisController");
const { protect } = require("../middleware/authMiddleware");

router.post("/analyze", protect, analyzeText);
router.get("/history", protect, getHistory);

module.exports = router;