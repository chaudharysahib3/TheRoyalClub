
const Player = require("../models/Player");
const Table = require("../models/Table");
const GameSession = require("../models/GameSession");
const Transaction = require("../models/Transaction");
const ChipDenomination = require("../models/ChipDenomination");
const ChipLocation = require("../models/ChipLocation");
const ChipLedger = require("../models/ChipLedger");

function todayDateString() {
  // Use the server local calendar date for operational daily reports.
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDateRange(dateString = todayDateString()) {
  dateString = dateString || todayDateString();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    throw new Error("Date must be in YYYY-MM-DD format");
  }

  const start = new Date(`${dateString}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime()) ||
      start.toISOString().slice(0, 10) !== dateString) {
    throw new Error("Invalid date");
  }

  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return { start, end };
}

async function getFinancialSummary(dateString) {
  const { start, end } = getDateRange(dateString);

  const transactions = await Transaction.find({
    status: "completed",
    createdAt: { $gte: start, $lt: end }
  }).lean();

  let totalBuyIn = 0;
  let totalCashOut = 0;
  let buyInCount = 0;
  let cashOutCount = 0;

  for (const transaction of transactions) {
    if (transaction.type === "buy_in") {
      totalBuyIn += transaction.amount;
      buyInCount++;
    }

    if (transaction.type === "cash_out") {
      totalCashOut += transaction.amount;
      cashOutCount++;
    }
  }

  return {
    date: dateString,
    totalBuyIn,
    totalCashOut,
    netCashMovement: totalBuyIn - totalCashOut,
    buyInCount,
    cashOutCount,
    totalTransactions: buyInCount + cashOutCount
  };
}

async function getDashboard() {
  const [
    totalPlayers,
    activePlayers,
    totalTables,
    openTables,
    activeSessions,
    totalTransactions
  ] = await Promise.all([
    Player.countDocuments(),
    Player.countDocuments({ status: "active" }),
    Table.countDocuments(),
    Table.countDocuments({ status: "open" }),
    GameSession.countDocuments({ status: "active" }),
    Transaction.countDocuments({ status: "completed" })
  ]);

  return {
    players: {
      total: totalPlayers,
      active: activePlayers
    },
    tables: {
      total: totalTables,
      open: openTables
    },
    sessions: {
      active: activeSessions
    },
    transactions: {
      completed: totalTransactions
    }
  };
}

async function getSessionReport(dateString) {
  const { start, end } = getDateRange(dateString);

  const sessions = await GameSession.find({
    startedAt: { $gte: start, $lt: end }
  })
    .populate("player", "name playerId")
    .populate("table", "tableNumber gameType")
    .sort({ startedAt: -1 })
    .lean();

  return {
    date: dateString,
    totalSessions: sessions.length,
    activeSessions: sessions.filter(
      s => s.status === "active"
    ).length,
    completedSessions: sessions.filter(
      s => s.status === "completed"
    ).length,
    sessions: sessions.map(session => ({
      ...session,
      chipDifference:
        session.finalChipCount == null
          ? null
          : session.finalChipCount - session.initialBuyIn
    }))
  };
}

async function getChipInventory() {
  const [denominations, locations, ledger] = await Promise.all([
    ChipDenomination.find({}).lean(),
    ChipLocation.find({}).lean(),
    ChipLedger.find({}).lean()
  ]);

  return {
    denominations,
    locations,
    movementCount: ledger.length,
    message:
      "Inventory master data and ledger records. " +
      "Verified location balances require matching " +
      "the existing chip movement schema."
  };
}

module.exports = {
  todayDateString,
  getDateRange,
  getFinancialSummary,
  getDashboard,
  getSessionReport,
  getChipInventory
};
