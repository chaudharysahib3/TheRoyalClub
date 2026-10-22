const mongoose = require("mongoose");

const pendingPlayerRegistrationSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, lowercase: true, trim: true, unique: true },
  phone: { type: String, required: true, trim: true },
  passwordHash: { type: String, required: true },
  otpHash: { type: String, required: true },
  expiresAt: { type: Date, required: true, expires: 0 },
  attempts: { type: Number, default: 0 },
  lastSentAt: { type: Date, default: Date.now },
}, { timestamps: true });

pendingPlayerRegistrationSchema.index({ email: 1 }, { unique: true });
module.exports = mongoose.model("PendingPlayerRegistration", pendingPlayerRegistrationSchema);
