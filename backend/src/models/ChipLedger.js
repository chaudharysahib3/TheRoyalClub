
const mongoose = require("mongoose");

const chipLedgerSchema = new mongoose.Schema(
  {
    denomination: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChipDenomination",
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isSafeInteger,
        message: "Quantity must be a whole number"
      }
    },
    movementType: {
      type: String,
      enum: [
        "opening_balance",
        "transfer",
        "issue_to_player",
        "redeem_from_player",
        "adjustment"
      ],
      required: true
    },
    fromLocation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChipLocation",
      default: null
    },
    toLocation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChipLocation",
      default: null
    },
    player: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Player",
      default: null
    },
    notes: {
      type: String,
      trim: true,
      default: ""
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  { timestamps: true }
);

chipLedgerSchema.index({ createdAt: -1 });
chipLedgerSchema.index({ denomination: 1, fromLocation: 1 });
chipLedgerSchema.index({ denomination: 1, toLocation: 1 });

module.exports = mongoose.model("ChipLedger", chipLedgerSchema);
