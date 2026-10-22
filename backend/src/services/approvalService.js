
const mongoose = require("mongoose");
const Approval = require("../models/Approval");
const { writeAudit } = require("./auditService");

async function createApproval(data, userId, ipAddress) {
  const { actionType, module, recordId, reason, payload } = data;

  if (!actionType || !module || !reason) {
    throw new Error("actionType, module and reason are required");
  }

  const approval = await Approval.create({
    requestedBy: userId,
    actionType,
    module,
    recordId: recordId || null,
    reason,
    payload: payload || {}
  });

  await writeAudit({
    actor: userId,
    action: "approval_requested",
    module: "approvals",
    recordId: approval._id,
    description: `Approval requested for ${module}: ${actionType}`,
    reason,
    ipAddress
  });

  return approval;
}

async function getApprovals(status) {
  const query = {};

  if (status) {
    if (!["pending", "approved", "rejected"].includes(status)) {
      throw new Error("Invalid approval status");
    }
    query.status = status;
  }

  return Approval.find(query)
    .populate("requestedBy", "name email role")
    .populate("reviewedBy", "name email role")
    .sort({ createdAt: -1 })
    .limit(100);
}

async function reviewApproval(approvalId, decision, userId, reviewNote, ipAddress) {
  if (!mongoose.isValidObjectId(approvalId)) {
    throw new Error("Invalid approval ID");
  }

  if (!["approved", "rejected"].includes(decision)) {
    throw new Error("Decision must be approved or rejected");
  }

  const approval = await Approval.findOne({
    _id: approvalId,
    status: "pending"
  });

  if (!approval) {
    throw new Error("Pending approval not found");
  }

  if (approval.requestedBy.toString() === userId.toString()) {
    throw new Error("Requester cannot approve or reject their own request");
  }

  approval.status = decision;
  approval.reviewedBy = userId;
  approval.reviewedAt = new Date();
  approval.reviewNote = reviewNote || "";

  await approval.save();

  await writeAudit({
    actor: userId,
    action: `approval_${decision}`,
    module: approval.module,
    recordId: approval._id,
    description: `Approval ${decision} for ${approval.actionType}`,
    reason: reviewNote || approval.reason,
    ipAddress
  });

  return approval;
}

module.exports = {
  createApproval,
  getApprovals,
  reviewApproval
};
