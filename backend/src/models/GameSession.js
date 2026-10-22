
const mongoose = require("mongoose");

const gameSessionSchema = new mongoose.Schema(
  {
    player: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Player",
      required: true,
      index: true
    },
    table: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Table",
      required: true
    },
    seatNumber: {
      type: Number,
      required: true,
      min: 1
    },
    startedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    endedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    startedAt: {
      type: Date,
      default: Date.now
    },
    endedAt: {
      type: Date,
      default: null
    },
    initialBuyIn: {
      type: Number,
      required: true,
      min: 0
    },
    finalChipCount: {
      type: Number,
      default: null,
      min: 0
    },
    status: {
      type: String,
      enum: ["active", "completed"],
      default: "active",
      index: true
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: ""
    }
  },
  { timestamps: true }
);

gameSessionSchema.index({ player: 1, status: 1 });
gameSessionSchema.index({ table: 1, status: 1 });

module.exports = mongoose.model("GameSession", gameSessionSchema);
