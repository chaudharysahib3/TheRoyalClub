
const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    transactionRef: {
      type: String,
      unique: true,
      index: true
    },
    player: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Player",
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: ["buy_in", "cash_out"],
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "card", "bank_transfer", "other"],
      default: "cash"
    },
    status: {
      type: String,
      enum: ["completed", "reversed"],
      default: "completed"
    },
    notes: {
      type: String,
      maxlength: 500,
      default: ""
    },
    cashier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    reversedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    reversedAt: Date,
    reversalReason: String
  },
  { timestamps: true }
);

transactionSchema.pre("validate", function () {
  if (!this.transactionRef && this.isNew) {
    this.transactionRef =
      "TRC-TXN-" +
      new mongoose.Types.ObjectId().toString().slice(-8).toUpperCase();
  }
});

module.exports = mongoose.model("Transaction", transactionSchema);
