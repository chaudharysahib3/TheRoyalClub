
const MembershipPlan = require("../models/MembershipPlan");
const Membership = require("../models/Membership");
const Player = require("../models/Player");
const Kyc = require("../models/Kyc");
const { writeAudit } = require("./auditService");

const createPlan = async (data) => {
  const { name, fee, validityDays, benefits = [] } = data;

  if (
    typeof name !== "string" ||
    !name.trim() ||
    typeof fee !== "number" ||
    !Number.isFinite(fee) ||
    fee < 0 ||
    !Number.isInteger(validityDays) ||
    validityDays < 1 ||
    !Array.isArray(benefits) ||
    !benefits.every(item => typeof item === "string")
  ) {
    const error = new Error("Valid plan name, fee, validity and benefits are required");
    error.statusCode = 400;
    throw error;
  }

  return MembershipPlan.create({
    name: name.trim(),
    fee,
    validityDays,
    benefits
  });
};

const getPlans = async () => {
  return MembershipPlan.find().sort({ fee: 1 });
};

const assignMembership = async (data, userId) => {
  const { playerId, planId } = data;

  if (!playerId || !planId) {
    const error = new Error("Player ID and membership plan ID are required");
    error.statusCode = 400;
    throw error;
  }

  const player = await Player.findById(playerId);
  if (!player) {
    const error = new Error("Player not found");
    error.statusCode = 404;
    throw error;
  }

  if (player.status !== "active") {
    const error = new Error("Membership cannot be assigned to an inactive or blocked player");
    error.statusCode = 400;
    throw error;
  }

  const approvedKyc = await Kyc.exists({
    player: player._id,
    status: "approved"
  });

  if (!approvedKyc) {
    const error = new Error("KYC must be approved before membership activation");
    error.statusCode = 400;
    throw error;
  }

  const plan = await MembershipPlan.findOne({
    _id: planId,
    active: true
  });

  if (!plan) {
    const error = new Error("Active membership plan not found");
    error.statusCode = 404;
    throw error;
  }

  const currentMembership = await Membership.findOne({
    player: player._id,
    status: "active",
    expiryDate: { $gt: new Date() }
  });

  if (currentMembership) {
    const error = new Error("Player already has an active membership");
    error.statusCode = 409;
    throw error;
  }

  const startDate = new Date();
  const expiryDate = new Date(startDate);
  expiryDate.setDate(expiryDate.getDate() + plan.validityDays);

  const membership = await Membership.create({
    player: player._id,
    plan: plan._id,
    feePaid: plan.fee,
    startDate,
    expiryDate,
    status: "active",
    createdBy: userId
  });

  player.membershipStatus = "active";
  await player.save();
  await writeAudit({
    actor: userId,
    action: "membership_activated",
    module: "memberships",
    recordId: membership._id,
    description: `Membership activated for player ${player.playerId}`,
    newValue: { playerId: player._id, planId: plan._id, feePaid: plan.fee, expiryDate },
    reason: "Membership assigned by authorized staff"
  });

  return membership;
};

const getMemberships = async () => {
  const now = new Date();

  await Membership.updateMany(
    { status: "active", expiryDate: { $lte: now } },
    { $set: { status: "expired" } }
  );

  return Membership.find()
    .populate("player", "playerId name phone membershipStatus")
    .populate("plan", "name fee validityDays")
    .sort({ createdAt: -1 })
    .limit(100);
};

module.exports = {
  createPlan,
  getPlans,
  assignMembership,
  getMemberships
};
