
const Transaction = require("../models/Transaction");
const Player = require("../models/Player");

const createTransaction = async (data, cashierId) => {
  const { playerId, type, amount, paymentMethod, notes } = data;

  if (!playerId || !["buy_in", "cash_out"].includes(type)) {
    const error = new Error("Valid player ID and transaction type are required");
    error.statusCode = 400;
    throw error;
  }

  if (
    typeof amount !== "number" ||
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    const error = new Error("Amount must be a positive number");
    error.statusCode = 400;
    throw error;
  }

  if (
    paymentMethod !== undefined &&
    !["cash", "card", "bank_transfer", "other"].includes(paymentMethod)
  ) {
    const error = new Error("Invalid payment method");
    error.statusCode = 400;
    throw error;
  }

  if (notes !== undefined && typeof notes !== "string") {
    const error = new Error("Notes must be text");
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
    const error = new Error("Only active players can transact");
    error.statusCode = 400;
    throw error;
  }

  return Transaction.create({
    player: player._id,
    type,
    amount,
    paymentMethod: paymentMethod || "cash",
    notes: notes?.trim() || "",
    cashier: cashierId
  });
};

const getTransactions = async (filters = {}) => {
  const query = {};

  if (filters.type) {
    if (!["buy_in", "cash_out"].includes(filters.type)) {
      const error = new Error("Invalid transaction type");
      error.statusCode = 400;
      throw error;
    }
    query.type = filters.type;
  }

  if (filters.playerId) {
    if (!/^[a-f\d]{24}$/i.test(filters.playerId)) {
      const error = new Error("Invalid player MongoDB ID");
      error.statusCode = 400;
      throw error;
    }
    query.player = filters.playerId;
  }

  return Transaction.find(query)
    .populate("player", "playerId name phone")
    .populate("cashier", "name email")
    .sort({ createdAt: -1 })
    .limit(100);
};

module.exports = { createTransaction, getTransactions };
