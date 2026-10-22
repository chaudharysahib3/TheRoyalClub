const mongoose = require("mongoose");
const Player = require("../models/Player");
const Table = require("../models/Table");
const WaitingList = require("../models/WaitingList");
const Transaction = require("../models/Transaction");
const Kyc = require("../models/Kyc");
const Membership = require("../models/Membership");
const GameSession = require("../models/GameSession");
const ChipPurchaseRequest = require("../models/ChipPurchaseRequest");
const Payment = require("../models/Payment");
const ChipPurchaseCredit = require("../models/ChipPurchaseCredit");
const { emitToRoles } = require("../sockets/socket");

async function findPlayer(req) {
  return Player.findOne({ email: String(req.user.email || "").toLowerCase() });
}
async function requireApprovedKyc(playerId) {
  const approved = await Kyc.exists({ player: playerId, status: "approved" });
  if (!approved) {
    const error = new Error("KYC approval is required before using this feature. Submit your documents and wait for owner/staff review.");
    error.statusCode = 403;
    error.code = "KYC_APPROVAL_REQUIRED";
    throw error;
  }
}
async function getMe(req, res, next) {
  try {
    const player = await findPlayer(req);
    if (!player) return res.status(404).json({ success: false, message: "Player profile not found" });
    let changed = false;
    if (!player.playerId) { player.playerId = "TRC-" + new mongoose.Types.ObjectId().toString().slice(-8).toUpperCase(); changed = true; }
    if (!player.membershipId) { player.membershipId = "TRC-M-" + new mongoose.Types.ObjectId().toString().slice(-8).toUpperCase(); changed = true; }
    if (changed) await player.save();
    res.json({ success: true, player });
  } catch (e) { next(e); }
}
async function updateMe(req, res, next) {
  try {
    const player = await findPlayer(req);
    if (!player) return res.status(404).json({ success: false, message: "Player profile not found" });
    const allowed = ["name", "phone", "dateOfBirth"];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        if (typeof req.body[key] !== "string") return res.status(400).json({ success: false, message: `${key} must be text` });
        if (key !== "dateOfBirth" && !req.body[key].trim()) return res.status(400).json({ success: false, message: `${key} must not be empty` });
        player[key] = key === "dateOfBirth" ? (req.body[key].trim() ? new Date(req.body[key]) : undefined) : req.body[key].trim();
      }
    }
    if (req.body.dateOfBirth && player.dateOfBirth && Number.isNaN(player.dateOfBirth.getTime())) return res.status(400).json({ success: false, message: "Enter a valid date of birth" });
    await player.save();
    res.json({ success: true, message: "Profile updated", player });
  } catch (e) { next(e); }
}
async function getTables(req, res, next) {
  try {
    const tables = await Table.find({ status: "open" }).select("tableNumber gameType maxSeats smallBlind bigBlind seats status").sort({ tableNumber: 1 });
    res.json({ success: true, tables: tables.map(t => ({ ...t.toObject(), availableSeats: Math.max(0, t.maxSeats - (t.seats || []).filter(s => s.player).length) })) });
  } catch (e) { next(e); }
}
async function getWallet(req, res, next) {
  try {
    const player = await findPlayer(req);
    if (!player) return res.status(404).json({ success: false, message: "Player profile not found" });
    const transactions = await Transaction.find({ player: player._id }).select("transactionRef type amount paymentMethod status notes createdAt").sort({ createdAt: -1 }).limit(100).lean();
    const totals = transactions.filter(x => x.status === "completed").reduce((a, x) => { if (x.type === "buy_in") a.buyIns += Number(x.amount || 0); if (x.type === "cash_out") a.cashOuts += Number(x.amount || 0); return a; }, { buyIns: 0, cashOuts: 0 });
    const requests = await ChipPurchaseRequest.find({ player: player._id }).select("requestRef amount status mode note reviewNote createdAt reviewedAt").sort({ createdAt: -1 }).limit(100).lean();
    const requestIds = requests.map(r => r._id);
    const payments = await Payment.find({ request: { $in: requestIds } }).select("request orderId paymentId amountPaise currency status environment statusHistory gatewayCapturedAt createdAt").lean();
    const paymentByRequest = new Map(payments.map(p => [String(p.request), p]));
    const purchaseCredits = await ChipPurchaseCredit.find({ player: player._id }).select("request amountInr chipRate chipsCredited reference approvedAt").sort({ createdAt: -1 }).lean();
    const enrichedRequests = requests.map(r => ({ ...r, payment: paymentByRequest.get(String(r._id)) || null }));
    const creditedChips = purchaseCredits.reduce((sum, row) => sum + Number(row.chipsCredited || 0), 0);
    res.json({ success: true, wallet: { currency: "INR", totalBuyIns: totals.buyIns, totalCashOuts: totals.cashOuts, netRecordedPosition: totals.buyIns - totals.cashOuts, demoCredits: 0, creditedChips, note: "Credited chips are club-use accounting units, not a bank balance or withdrawable wallet. Chip credit occurs only after verified payment and owner approval." }, transactions, purchaseRequests: enrichedRequests, purchaseCredits });
  } catch (e) { next(e); }
}
async function createPurchaseRequest(req, res, next) {
  try {
    const player = await findPlayer(req);
    if (!player) return res.status(404).json({ success: false, message: "Player profile not found" });
    if (player.status !== "active") return res.status(403).json({ success: false, message: "Only active player accounts can submit a request" });
    await requireApprovedKyc(player._id);
    const amount = Number(req.body.amount);
    if (!Number.isFinite(amount) || amount < 1 || amount > 10000000 || Math.round(amount * 100) !== amount * 100) return res.status(400).json({ success: false, message: "Enter a valid amount between ₹1 and ₹1,00,00,000 (up to 2 decimals)" });
    const request = await ChipPurchaseRequest.create({ player: player._id, amount, mode: "demo", status: "pending_review" });
    try { emitToRoles(["owner", "general_manager", "floor_manager", "cashier"], "chip-purchase:requested", { message: "A demo chip purchase request was submitted." }); } catch (e) {}
    res.status(201).json({ success: true, message: "Demo purchase request saved. No payment was taken and no chips were credited.", request });
  } catch (e) { next(e); }
}
async function getMyKyc(req, res, next) {
  try {
    const player = await findPlayer(req);
    if (!player) return res.status(404).json({ success: false, message: "Player profile not found" });
    const records = await Kyc.find({ player: player._id }).select("-documentRef").sort({ createdAt: -1 });
    res.json({ success: true, records });
  } catch (e) { next(e); }
}
async function getMyMembership(req, res, next) {
  try {
    const player = await findPlayer(req);
    if (!player) return res.status(404).json({ success: false, message: "Player profile not found" });
    const memberships = await Membership.find({ player: player._id }).populate("plan", "name fee validityDays benefits").select("-__v").sort({ createdAt: -1 }).limit(20);
    res.json({ success: true, membershipStatus: player.membershipStatus, memberships });
  } catch (e) { next(e); }
}
async function getMySessions(req, res, next) {
  try {
    const player = await findPlayer(req);
    if (!player) return res.status(404).json({ success: false, message: "Player profile not found" });
    const sessions = await GameSession.find({ player: player._id }).populate("table", "tableNumber gameType").select("-__v").sort({ startedAt: -1 }).limit(100);
    res.json({ success: true, sessions });
  } catch (e) { next(e); }
}
async function requestWaitlist(req, res, next) {
  try {
    const { preferredGame } = req.body;
    if (!["Texas Hold'em", "Omaha", "Other"].includes(preferredGame)) return res.status(400).json({ success: false, message: "Choose a valid game type" });
    const player = await findPlayer(req);
    if (!player || player.status !== "active") return res.status(404).json({ success: false, message: "Active player profile not found" });
    await requireApprovedKyc(player._id);
    const existing = await WaitingList.findOne({ player: player._id, status: "waiting" });
    if (existing) return res.status(409).json({ success: false, message: "You already have an active waiting-list request" });
    const entry = await WaitingList.create({ player: player._id, preferredGame, createdBy: req.user.id });
    try { emitToRoles(["owner", "general_manager", "floor_manager"], "waitlist:updated", { message: "A player submitted a waiting-list request." }); } catch (e) {}
    res.status(201).json({ success: true, message: "Waiting-list request submitted", entry });
  } catch (e) { next(e); }
}
async function getMyWaitlist(req, res, next) {
  try {
    const player = await findPlayer(req);
    if (!player) return res.status(404).json({ success: false, message: "Player profile not found" });
    const entries = await WaitingList.find({ player: player._id }).populate("table", "tableNumber gameType").sort({ requestedAt: -1 }).limit(50);
    res.json({ success: true, entries });
  } catch (e) { next(e); }
}
async function cancelMyWaitlist(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid waiting-list request" });
    const player = await findPlayer(req);
    const entry = await WaitingList.findOne({ _id: req.params.id, player: player?._id });
    if (!entry) return res.status(404).json({ success: false, message: "Waiting-list request not found" });
    if (entry.status !== "waiting") return res.status(409).json({ success: false, message: "Only waiting requests can be cancelled" });
    entry.status = "cancelled";
    await entry.save();
    res.json({ success: true, message: "Waiting-list request cancelled", entry });
  } catch (e) { next(e); }
}
module.exports = { getMe, updateMe, getTables, getWallet, createPurchaseRequest, getMyKyc, getMyMembership, getMySessions, requestWaitlist, getMyWaitlist, cancelMyWaitlist };
