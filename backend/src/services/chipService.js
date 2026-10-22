
const ChipDenomination = require("../models/ChipDenomination");
const ChipLocation = require("../models/ChipLocation");
const ChipLedger = require("../models/ChipLedger");
const Player = require("../models/Player");

async function createDenomination(data, userId) {
  const { name, value, color } = data;

  if (!name || value === undefined || !Number.isFinite(Number(value)) || Number(value) <= 0) {
    throw new Error("Valid denomination name and value are required");
  }

  const normalizedName = String(name).trim();
  const duplicate = await ChipDenomination.findOne({
    name: { $regex: `^${normalizedName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" }
  });
  if (duplicate) {
    throw new Error("A chip denomination with this name already exists. Choose a different name.");
  }

  try {
    return await ChipDenomination.create({
      name: normalizedName,
      value: Number(value),
      color,
      createdBy: userId
    });
  } catch (error) {
    if (error && error.code === 11000) {
      throw new Error("A chip denomination with this name already exists. Choose a different name.");
    }
    throw error;
  }
}

async function getDenominations() {
  return ChipDenomination.find().sort({ value: 1 });
}

async function createLocation(data, userId) {
  const { name, type, tableId } = data;

  if (!name || !["vault", "cashier", "table"].includes(type)) {
    throw new Error("Valid location name and type are required");
  }

  if (type === "table" && !tableId) {
    throw new Error("tableId is required for a table location");
  }

  return ChipLocation.create({
    name,
    type,
    tableId: type === "table" ? tableId : null,
    createdBy: userId
  });
}

async function getLocations() {
  return ChipLocation.find({ active: true }).sort({ name: 1 });
}

async function getBalance(denominationId, locationId) {
  const records = await ChipLedger.find({
    denomination: denominationId,
    $or: [
      { fromLocation: locationId },
      { toLocation: locationId }
    ]
  }).lean();

  let balance = 0;

  for (const record of records) {
    if (String(record.toLocation) === String(locationId)) {
      balance += record.quantity;
    }

    if (String(record.fromLocation) === String(locationId)) {
      balance -= record.quantity;
    }
  }

  return balance;
}

async function recordMovement(data, userId) {
  const {
    denominationId,
    quantity,
    movementType,
    fromLocationId,
    toLocationId,
    playerId,
    notes
  } = data;

  const allowedTypes = [
    "opening_balance",
    "transfer",
    "issue_to_player",
    "redeem_from_player",
    "adjustment"
  ];

  if (!denominationId || !Number.isSafeInteger(Number(quantity)) || Number(quantity) < 1) {
    throw new Error("Valid denominationId and whole-number quantity are required");
  }

  if (!allowedTypes.includes(movementType)) {
    throw new Error("Invalid chip movement type");
  }

  const denomination = await ChipDenomination.findOne({
    _id: denominationId,
    active: true
  });

  if (!denomination) {
    throw new Error("Active chip denomination not found");
  }

  let fromLocation = null;
  let toLocation = null;
  let player = null;

  if (movementType === "opening_balance") {
    if (fromLocationId || !toLocationId) {
      throw new Error("Opening balance requires only a destination location");
    }
  } else if (movementType === "transfer") {
    if (!fromLocationId || !toLocationId || fromLocationId === toLocationId) {
      throw new Error("Transfer requires different source and destination locations");
    }
  } else if (movementType === "issue_to_player") {
    if (!fromLocationId || !playerId || toLocationId) {
      throw new Error("Chip issue requires a source location and player");
    }
  } else if (movementType === "redeem_from_player") {
    if (!toLocationId || !playerId || fromLocationId) {
      throw new Error("Chip redemption requires a destination location and player");
    }
  } else if (movementType === "adjustment") {
    if (Boolean(fromLocationId) === Boolean(toLocationId)) {
      throw new Error("Adjustment requires exactly one source or destination location");
    }
  }

  const sourceId = fromLocationId || null;
  const destinationId = toLocationId || null;

  if (sourceId) {
    fromLocation = await ChipLocation.findOne({
      _id: sourceId,
      active: true
    });

    if (!fromLocation) throw new Error("Active source location not found");
  }

  if (destinationId) {
    toLocation = await ChipLocation.findOne({
      _id: destinationId,
      active: true
    });

    if (!toLocation) throw new Error("Active destination location not found");
  }

  if (playerId) {
    player = await Player.findOne({
      _id: playerId,
      status: "active"
    });

    if (!player) throw new Error("Active player not found");
  }

  if (fromLocation) {
    const currentBalance = await getBalance(
      denominationId,
      fromLocation._id
    );

    if (currentBalance < Number(quantity)) {
      throw new Error(
        `Insufficient chip balance. Available: ${currentBalance}`
      );
    }
  }

  return ChipLedger.create({
    denomination: denominationId,
    quantity: Number(quantity),
    movementType,
    fromLocation: fromLocation?._id || null,
    toLocation: toLocation?._id || null,
    player: player?._id || null,
    notes: notes || "",
    createdBy: userId
  });
}

async function getLedger(filters = {}) {
  const query = {};

  if (filters.denominationId) {
    query.denomination = filters.denominationId;
  }

  if (filters.locationId) {
    query.$or = [
      { fromLocation: filters.locationId },
      { toLocation: filters.locationId }
    ];
  }

  if (filters.playerId) {
    query.player = filters.playerId;
  }

  return ChipLedger.find(query)
    .populate("denomination", "name value color")
    .populate("fromLocation", "name type")
    .populate("toLocation", "name type")
    .populate("player", "name playerId")
    .populate("createdBy", "name email")
    .sort({ createdAt: -1 })
    .limit(200);
}

async function getInventory() {
  const denominations = await getDenominations();
  const locations = await getLocations();
  const inventory = [];

  for (const location of locations) {
    for (const denomination of denominations) {
      inventory.push({
        location: {
          _id: location._id,
          name: location.name,
          type: location.type
        },
        denomination: {
          _id: denomination._id,
          name: denomination.name,
          value: denomination.value
        },
        quantity: await getBalance(denomination._id, location._id)
      });
    }
  }

  return inventory;
}

module.exports = {
  createDenomination,
  getDenominations,
  createLocation,
  getLocations,
  recordMovement,
  getLedger,
  getInventory
};
