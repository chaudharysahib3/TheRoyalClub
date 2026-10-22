
const Kyc = require("../models/Kyc");
const Player = require("../models/Player");
const { writeAudit } = require("./auditService");

const submitKyc = async (data) => {
  const { playerId, documentType, documentRef } = data;

  if (!playerId || !documentType ||
      typeof documentRef !== "string" || !documentRef.trim()) {
    const error = new Error("Player, document type and document reference are required");
    error.statusCode = 400;
    throw error;
  }

  const player = await Player.findById(playerId);
  if (!player) {
    const error = new Error("Player not found");
    error.statusCode = 404;
    throw error;
  }

  return Kyc.create({
    player: player._id,
    documentType,
    documentRef: documentRef.trim()
  });
};

const getKycRecords = async (status) => {
  const filter = {};

  if (status) {
    if (!["pending", "approved", "rejected"].includes(status)) {
      const error = new Error("Invalid KYC status");
      error.statusCode = 400;
      throw error;
    }
    filter.status = status;
  }

  return Kyc.find(filter)
    .select("documentType status reviewedBy reviewedAt reviewNote createdAt updatedAt")
    .populate("player", "playerId name email phone")
    .populate("reviewedBy", "name email")
    .sort({ createdAt: -1 });
};

const reviewKyc = async (id, status, note, reviewerId) => {
  if (!["approved", "rejected"].includes(status)) {
    const error = new Error("Status must be approved or rejected");
    error.statusCode = 400;
    throw error;
  }

  if (status === "rejected" && (typeof note !== "string" || !note.trim())) {
    const error = new Error("A rejection reason is required");
    error.statusCode = 400;
    throw error;
  }

  if (note !== undefined && typeof note !== "string") {
    const error = new Error("Review note must be text");
    error.statusCode = 400;
    throw error;
  }

  const record = await Kyc.findById(id);

  if (!record) {
    const error = new Error("KYC record not found");
    error.statusCode = 404;
    throw error;
  }

  if (record.status !== "pending") {
    const error = new Error("This KYC record has already been reviewed");
    error.statusCode = 409;
    throw error;
  }

  record.status = status;
  record.reviewedBy = reviewerId;
  record.reviewedAt = new Date();
  record.reviewNote = note?.trim() || "";

  await record.save();
  await writeAudit({
    actor: reviewerId,
    action: `kyc_${status}`,
    module: "kyc",
    recordId: record._id,
    description: `KYC document ${status}`,
    reason: record.reviewNote || "KYC review",
    newValue: { status: record.status },
    outcome: "success"
  });
  return record;
};

module.exports = { submitKyc, getKycRecords, reviewKyc };
