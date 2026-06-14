const mongoose = require("mongoose");

const analysisSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    label: {
      type: String,
      enum: ["FAKE", "REAL"],
      required: true,
    },
    confidence: {
      type: Number,
      required: true,
    },
    explanation: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Analysis", analysisSchema);