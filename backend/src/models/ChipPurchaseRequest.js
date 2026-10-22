const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  requestRef: { type: String, unique: true, index: true },
  player: { type: mongoose.Schema.Types.ObjectId, ref: "Player", required: true, index: true },
  amount: { type: Number, required: true, min: 1, max: 10000000 },
  mode: { type: String, enum: ["demo", "razorpay"], default: "demo", index: true },
  gatewayOrderId: { type: String, default: undefined },
  idempotencyKey: { type: String, default: undefined },
  status: { type: String, enum: ["pending_review", "approved_demo", "rejected", "cancelled", "payment_pending", "payment_setup_failed", "payment_failed", "awaiting_owner_approval", "approved"], default: "pending_review", index: true },
  note: { type: String, maxlength: 500, default: "Demo request only. No real payment received and no chips credited." },
  reviewedAt: Date,
  reviewNote: { type: String, maxlength: 500, default: "" }
}, { timestamps: true });
schema.index({ idempotencyKey: 1 }, { unique: true, partialFilterExpression: { idempotencyKey: { $type: "string" } } });
schema.index({ gatewayOrderId: 1 }, { unique: true, partialFilterExpression: { gatewayOrderId: { $type: "string" } } });
schema.pre("validate", function () {
  if (!this.requestRef && this.isNew) this.requestRef = `TRC-${this.mode === "razorpay" ? "PAY" : "DEMO"}-${new mongoose.Types.ObjectId().toString().slice(-8).toUpperCase()}`;
});
module.exports = mongoose.model("ChipPurchaseRequest", schema);
