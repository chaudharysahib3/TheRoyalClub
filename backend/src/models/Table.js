
const mongoose = require("mongoose");

const seatSchema = new mongoose.Schema(
  {
    seatNumber: {
      type: Number,
      required: true,
      min: 1
    },
    player: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Player",
      default: null
    },
    seatedAt: {
      type: Date,
      default: null
    }
  },
  { _id: false }
);

const tableSchema = new mongoose.Schema(
  {
    tableNumber: {
      type: String,
      required: true,
      trim: true,
      unique: true
    },
    gameType: {
      type: String,
      required: true,
      enum: ["Texas Hold'em", "Omaha", "Other"]
    },
    maxSeats: {
      type: Number,
      required: true,
      min: 2,
      max: 12
    },
    smallBlind: {
      type: Number,
      required: true,
      min: 0
    },
    bigBlind: {
      type: Number,
      required: true,
      min: 0
    },
    status: {
      type: String,
      enum: ["open", "closed"],
      default: "open"
    },
    dealer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    seats: {
      type: [seatSchema],
      default: []
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  { timestamps: true }
);

tableSchema.index({ status: 1, gameType: 1 });

module.exports = mongoose.model("Table", tableSchema);
