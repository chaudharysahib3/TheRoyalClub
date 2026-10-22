const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  eventId: { type: String, required: true, unique: true, index: true },
  event: { type: String, required: true },
  receivedAt: { type: Date, required: true, default: Date.now }
}, { timestamps: true, versionKey: false });
module.exports = mongoose.model("GatewayWebhookEvent", schema);
