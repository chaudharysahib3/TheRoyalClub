const mongoose = require("mongoose");
const ChipPurchaseRequest = require("../models/ChipPurchaseRequest");
const Payment = require("../models/Payment");
const { writeAudit } = require("./auditService");

async function getRequests(status) {
  const filter = {};
  if (status) {
    if (!["pending_review", "approved_demo", "rejected", "cancelled", "payment_pending", "payment_setup_failed", "awaiting_owner_approval", "approved"].includes(status)) {
      const e = new Error("Invalid request status"); e.statusCode = 400; throw e;
    }
    filter.status = status;
  }
  const requests = await ChipPurchaseRequest.find(filter)
    .populate("player", "playerId membershipId name email phone status membershipStatus")
    .sort({ createdAt: -1 }).limit(200);
  // Keep actionable items at the top of the owner/staff review queue.
  const ordered = requests.sort((a, b) => {
    const actionable = ["pending_review", "awaiting_owner_approval"];
    const aPending = actionable.includes(a.status) ? 0 : 1;
    const bPending = actionable.includes(b.status) ? 0 : 1;
    return aPending - bPending || new Date(b.createdAt) - new Date(a.createdAt);
  });
  const payments = await Payment.find({ request: { $in: ordered.map(r => r._id) } }).select("request orderId paymentId amountPaise currency status environment statusHistory gatewayCapturedAt createdAt").lean();
  const byRequest = new Map(payments.map(p => [String(p.request), p]));
  return ordered.map(r => ({ ...r.toObject(), payment: byRequest.get(String(r._id)) || null }));
}

async function reviewRequest(id, decision, reviewNote, reviewerId, ipAddress) {
  if (!mongoose.isValidObjectId(id)) {
    const e = new Error("Invalid purchase request ID"); e.statusCode = 400; throw e;
  }
  if (!["approved_demo", "rejected"].includes(decision)) {
    const e = new Error("Decision must be approved_demo or rejected"); e.statusCode = 400; throw e;
  }
  if (reviewNote !== undefined && (typeof reviewNote !== "string" || reviewNote.length > 500)) {
    const e = new Error("Review note must be text up to 500 characters"); e.statusCode = 400; throw e;
  }
  const request = await ChipPurchaseRequest.findOne({ _id: id, status: "pending_review" });
  if (!request) {
    const e = new Error("Pending chip purchase request not found"); e.statusCode = 404; throw e;
  }
  request.status = decision;
  request.reviewNote = (reviewNote || "").trim();
  request.reviewedAt = new Date();
  await request.save();
  await writeAudit({
    actor: reviewerId,
    action: decision === "approved_demo" ? "chip_purchase_demo_approved" : "chip_purchase_rejected",
    module: "chip_purchase_requests",
    recordId: request._id,
    description: `Demo chip purchase request ${decision}`,
    reason: request.reviewNote || "Staff review",
    ipAddress
  });
  return request.populate("player", "playerId membershipId name email phone status membershipStatus");
}
module.exports = { getRequests, reviewRequest };
