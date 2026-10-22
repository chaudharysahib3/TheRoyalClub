
const WaitingList = require("../models/WaitingList");
const Player = require("../models/Player");
const Table = require("../models/Table");
const tableService = require("./tableService");

async function addToWaitingList(data, userId) {
  const { playerId, preferredGame } = data;

  if (!playerId) {
    throw new Error("playerId is required");
  }

  const player = await Player.findOne({
    _id: playerId,
    status: "active"
  });

  if (!player) {
    throw new Error("Active player not found");
  }

  const existing = await WaitingList.findOne({
    player: playerId,
    status: "waiting"
  });

  if (existing) {
    throw new Error("Player is already on the waiting list");
  }

  return WaitingList.create({
    player: playerId,
    preferredGame: preferredGame || "Texas Hold'em",
    createdBy: userId
  });
}

async function getWaitingList() {
  return WaitingList.find({ status: "waiting" })
    .populate("player", "name email phone playerId")
    .populate("createdBy", "name email")
    .sort({ requestedAt: 1 });
}

async function cancelWaitingListEntry(entryId) {
  const entry = await WaitingList.findOne({
    _id: entryId,
    status: "waiting"
  });

  if (!entry) {
    throw new Error("Active waiting-list entry not found");
  }

  entry.status = "cancelled";
  await entry.save();

  return entry;
}

async function assignFromWaitingList(entryId, tableId, seatNumber) {
  const entry = await WaitingList.findOne({
    _id: entryId,
    status: "waiting"
  });

  if (!entry) {
    throw new Error("Active waiting-list entry not found");
  }

  const table = await Table.findById(tableId);

  if (!table) {
    throw new Error("Table not found");
  }

  if (table.gameType !== entry.preferredGame &&
      entry.preferredGame !== "Other") {
    throw new Error("Table game does not match player's preferred game");
  }

  // Reuse the existing seating logic.
  await tableService.seatPlayer(
    tableId,
    entry.player.toString(),
    Number(seatNumber)
  );

  entry.status = "seated";
  entry.table = tableId;
  entry.seatNumber = Number(seatNumber);
  entry.seatedAt = new Date();

  await entry.save();

  return entry.populate([
    { path: "player", select: "name email playerId" },
    { path: "table" }
  ]);
}

module.exports = {
  addToWaitingList,
  getWaitingList,
  cancelWaitingListEntry,
  assignFromWaitingList
};
