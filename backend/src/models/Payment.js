const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  request: { type: mongoose.Schema.Types.ObjectId, ref: "ChipPurchaseRequest", required: true, unique: true, index: true },
  player: { type: mongoose.Schema.Types.ObjectId, ref: "Player", required: true, index: true },
  provider: { type: String, enum: ["razorpay"], default: "razorpay" },
  environment: { type: String, enum: ["test", "live", "unknown"], default: "unknown", index: true },
  statusHistory: [{ status: { type: String, required: true }, source: { type: String, required: true }, note: { type: String, default: "" }, at: { type: Date, default: Date.now } }],
  orderId: { type: String, required: true, unique: true, index: true },
  paymentId: { type: String, default: undefined },
  amountPaise: { type: Number, required: true, min: 100 },
  currency: { type: String, required: true, enum: ["INR"], default: "INR" },
  status: { type: String, enum: ["created", "authorized", "paid_verified", "failed", "refunded"], default: "created", index: true },
  checkoutSignatureVerifiedAt: Date,
  gatewayCapturedAt: Date,
  lastGatewayEventId: { type: String, default: null },
  rawStatus: { type: String, default: "" }
}, { timestamps: true });
paymentSchema.index({ paymentId: 1 }, { unique: true, partialFilterExpression: { paymentId: { $type: "string" } } });
paymentSchema.index({ request: 1, status: 1 });
module.exports = mongoose.model("Payment", paymentSchema);
