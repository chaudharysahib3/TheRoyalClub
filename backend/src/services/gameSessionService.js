
const mongoose = require("mongoose");
const GameSession = require("../models/GameSession");
const Player = require("../models/Player");
const Table = require("../models/Table");
const Transaction = require("../models/Transaction");

async function startSession(data, userId) {
  const { playerId, tableId, seatNumber, buyInAmount, paymentMethod } = data;

  if (!playerId || !tableId || seatNumber == null) {
    throw new Error("playerId, tableId and seatNumber are required");
  }

  const amount = Number(buyInAmount);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("buyInAmount must be greater than zero");
  }

  if (!["cash", "card", "bank_transfer", "other"].includes(paymentMethod)) {
    throw new Error("Invalid paymentMethod");
  }

  if (
    !mongoose.isValidObjectId(playerId) ||
    !mongoose.isValidObjectId(tableId)
  ) {
    throw new Error("Invalid playerId or tableId");
  }

  const player = await Player.findOne({
    _id: playerId,
    status: "active"
  });

  if (!player) throw new Error("Active player not found");

  const table = await Table.findById(tableId);

  if (!table || table.status !== "open") {
    throw new Error("Open table not found");
  }

  const seat = table.seats.find(
    item => item.seatNumber === Number(seatNumber)
  );

  if (!seat || !seat.player || seat.player.toString() !== playerId) {
    throw new Error("Player must be seated at the selected table and seat");
  }

  const activeSession = await GameSession.findOne({
    player: playerId,
    status: "active"
  });

  if (activeSession) {
    throw new Error("Player already has an active game session");
  }

  // This records the buy-in in the existing transaction collection.
  // It does NOT process an actual card/bank payment or verify chip delivery.
  const transaction = await Transaction.create({
    player: playerId,
    type: "buy_in",
    amount,
    paymentMethod,
    status: "completed",
    cashier: userId,
    notes: `Buy-in for table ${table.tableNumber}`
  });

  try {
    return await GameSession.create({
      player: playerId,
      table: tableId,
      seatNumber: Number(seatNumber),
      startedBy: userId,
      initialBuyIn: amount,
      notes: `Buy-in transaction: ${transaction.transactionRef}`
    });
  } catch (error) {
    // Avoid silently leaving a completed buy-in record if session creation fails.
    // This is a compensating record, not a full atomic financial reversal workflow.
    await Transaction.create({
      player: playerId,
      type: "cash_out",
      amount,
      paymentMethod,
      status: "reversed",
      cashier: userId,
      notes: `Compensation for failed session creation; original transaction: ${transaction.transactionRef}`
    }).catch(() => {});

    throw error;
  }
}

async function getSessions(filters = {}) {
  const query = {};

  if (filters.status && ["active", "completed"].includes(filters.status)) {
    query.status = filters.status;
  }

  if (filters.playerId && mongoose.isValidObjectId(filters.playerId)) {
    query.player = filters.playerId;
  }

  if (filters.tableId && mongoose.isValidObjectId(filters.tableId)) {
    query.table = filters.tableId;
  }

  return GameSession.find(query)
    .populate("player", "name email playerId")
    .populate("table", "tableNumber gameType")
    .populate("startedBy", "name email")
    .populate("endedBy", "name email")
    .sort({ startedAt: -1 })
    .limit(100);
}

async function getSessionById(sessionId) {
  if (!mongoose.isValidObjectId(sessionId)) {
    throw new Error("Invalid session ID");
  }

  const session = await GameSession.findById(sessionId)
    .populate("player", "name email playerId")
    .populate("table", "tableNumber gameType")
    .populate("startedBy", "name email")
    .populate("endedBy", "name email");

  if (!session) throw new Error("Game session not found");
  return session;
}

async function endSession(sessionId, data, userId) {
  const finalChipCount = Number(data.finalChipCount);

  if (!Number.isFinite(finalChipCount) || finalChipCount < 0) {
    throw new Error("finalChipCount must be zero or greater");
  }

  const session = await GameSession.findOne({
    _id: sessionId,
    status: "active"
  });

  if (!session) {
    throw new Error("Active game session not found");
  }

  session.finalChipCount = finalChipCount;
  session.endedAt = new Date();
  session.endedBy = userId;
  session.status = "completed";

  if (data.notes) {
    session.notes = data.notes;
  }

  await session.save();

  return session;
}

module.exports = {
  startSession,
  getSessions,
  getSessionById,
  endSession
};
