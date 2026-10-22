
const mongoose = require("mongoose");

const waitingListSchema = new mongoose.Schema(
  {
    player: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Player",
      required: true
    },
    preferredGame: {
      type: String,
      enum: ["Texas Hold'em", "Omaha", "Other"],
      default: "Texas Hold'em"
    },
    status: {
      type: String,
      enum: ["waiting", "seated", "cancelled"],
      default: "waiting"
    },
    table: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Table",
      default: null
    },
    seatNumber: {
      type: Number,
      default: null
    },
    requestedAt: {
      type: Date,
      default: Date.now
    },
    seatedAt: {
      type: Date,
      default: null
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  { timestamps: true }
);

waitingListSchema.index({ status: 1, requestedAt: 1 });

module.exports = mongoose.model("WaitingList", waitingListSchema);
