const mongoose = require("mongoose");

// Append-only credit record. One credit per approved purchase request.
const schema = new mongoose.Schema({
  request: { type: mongoose.Schema.Types.ObjectId, ref: "ChipPurchaseRequest", required: true, unique: true, index: true },
  payment: { type: mongoose.Schema.Types.ObjectId, ref: "Payment", required: true, unique: true, index: true },
  player: { type: mongoose.Schema.Types.ObjectId, ref: "Player", required: true, index: true },
  amountInr: { type: Number, required: true, min: 0.01 },
  environment: { type: String, enum: ["test", "live", "unknown"], default: "unknown", index: true },
  chipRate: { type: Number, required: true, min: 0.0001 },
  chipsCredited: { type: Number, required: true, min: 0.0001 },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  approvedAt: { type: Date, required: true },
  reference: { type: String, required: true, unique: true, index: true }
}, { timestamps: true, versionKey: false, strict: true });
module.exports = mongoose.model("ChipPurchaseCredit", schema);
