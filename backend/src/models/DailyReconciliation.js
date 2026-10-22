
const mongoose = require("mongoose");

const dailyReconciliationSchema = new mongoose.Schema(
  {
    businessDate: {
      type: String,
      required: true,
      unique: true
    },

    openingCash: {
      type: Number,
      required: true,
      min: 0
    },

    totalBuyIn: {
      type: Number,
      default: 0
    },

    totalCashOut: {
      type: Number,
      default: 0
    },

    expectedClosingCash: {
      type: Number,
      required: true
    },

    actualClosingCash: {
      type: Number,
      required: true,
      min: 0
    },

    variance: {
      type: Number,
      required: true
    },

    status: {
      type: String,
      enum: ["balanced", "variance"],
      required: true
    },

    notes: {
      type: String,
      default: ""
    },

    closedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "DailyReconciliation",
  dailyReconciliationSchema
);
