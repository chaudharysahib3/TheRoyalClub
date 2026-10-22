
const Table = require("../models/Table");
const User = require("../models/User");
const Player = require("../models/Player");

async function createTable(data, userId) {
  const {
    tableNumber,
    gameType,
    maxSeats,
    smallBlind,
    bigBlind
  } = data;

  if (!tableNumber || !gameType) {
    throw new Error("Table number and game type are required");
  }

  if (
    !Number.isInteger(Number(maxSeats)) ||
    Number(maxSeats) < 2 ||
    Number(maxSeats) > 12
  ) {
    throw new Error("maxSeats must be between 2 and 12");
  }

  if (
    !Number.isFinite(Number(smallBlind)) ||
    !Number.isFinite(Number(bigBlind)) ||
    Number(smallBlind) < 0 ||
    Number(bigBlind) <= 0 ||
    Number(bigBlind) < Number(smallBlind)
  ) {
    throw new Error("Invalid blind values");
  }

  return Table.create({
    tableNumber,
    gameType,
    maxSeats: Number(maxSeats),
    smallBlind: Number(smallBlind),
    bigBlind: Number(bigBlind),
    createdBy: userId
  });
}

async function getTables() {
  return Table.find()
    .populate("dealer", "name email")
    .populate("seats.player", "name playerId")
    .sort({ tableNumber: 1 });
}

async function getTableById(tableId) {
  const table = await Table.findById(tableId)
    .populate("dealer", "name email")
    .populate("seats.player", "name playerId");

  if (!table) throw new Error("Table not found");
  return table;
}

async function assignDealer(tableId, dealerId) {
  const dealer = await User.findById(dealerId);

  if (!dealer) throw new Error("Dealer user not found");

  // Role names can differ in your existing User schema.
  if (dealer.role !== "dealer") {
    throw new Error("Selected user does not have the dealer role");
  }

  const table = await Table.findByIdAndUpdate(
    tableId,
    { dealer: dealerId },
    { new: true, runValidators: true }
  );

  if (!table) throw new Error("Table not found");
  return table;
}

async function updateTableStatus(tableId, status) {
  if (!["open", "closed"].includes(status)) {
    throw new Error("Status must be open or closed");
  }

  const table = await Table.findById(tableId);
  if (!table) throw new Error("Table not found");

  if (status === "closed" && table.seats.some(seat => seat.player)) {
    throw new Error("Remove all seated players before closing this table");
  }

  table.status = status;
  await table.save();
  return table;
}

async function seatPlayer(tableId, playerId, seatNumber) {
  const table = await Table.findById(tableId);

  if (!table) throw new Error("Table not found");
  if (table.status !== "open") throw new Error("Table is closed");

  if (
    !Number.isInteger(Number(seatNumber)) ||
    Number(seatNumber) < 1 ||
    Number(seatNumber) > table.maxSeats
  ) {
    throw new Error("Invalid seat number");
  }

  const player = await Player.findOne({
    _id: playerId,
    status: "active"
  });

  if (!player) throw new Error("Active player not found");

  const existingSeat = table.seats.find(
    seat => seat.seatNumber === Number(seatNumber)
  );

  if (existingSeat?.player) throw new Error("Seat is already occupied");

  const alreadySeated = table.seats.some(
    seat => seat.player && seat.player.toString() === playerId
  );

  if (alreadySeated) {
    throw new Error("Player is already seated at this table");
  }

  const seat = existingSeat || {
    seatNumber: Number(seatNumber),
    player: null,
    seatedAt: null
  };

  seat.player = player._id;
  seat.seatedAt = new Date();

  if (!existingSeat) table.seats.push(seat);

  await table.save();
  return table;
}

async function removePlayer(tableId, seatNumber) {
  const table = await Table.findById(tableId);
  if (!table) throw new Error("Table not found");

  const seat = table.seats.find(
    item => item.seatNumber === Number(seatNumber)
  );

  if (!seat || !seat.player) {
    throw new Error("No player is seated at this seat");
  }

  seat.player = null;
  seat.seatedAt = null;

  await table.save();
  return table;
}

module.exports = {
  createTable,
  getTables,
  getTableById,
  assignDealer,
  updateTableStatus,
  seatPlayer,
  removePlayer
};
