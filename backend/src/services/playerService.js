
const Player = require("../models/Player");

const createPlayer = async (data, userId) => {
  const { name, email, phone, dateOfBirth } = data;

  if (
    typeof name !== "string" ||
    !name.trim() ||
    typeof phone !== "string" ||
    !phone.trim()
  ) {
    const error = new Error("Player name and phone are required");
    error.statusCode = 400;
    throw error;
  }

  if (
    email !== undefined &&
    (typeof email !== "string" || !email.trim())
  ) {
    const error = new Error("Email must be a valid non-empty string");
    error.statusCode = 400;
    throw error;
  }

  if (dateOfBirth && Number.isNaN(Date.parse(dateOfBirth))) {
    const error = new Error("Invalid date of birth");
    error.statusCode = 400;
    throw error;
  }

  const normalizedEmail = email?.trim().toLowerCase();

  if (normalizedEmail) {
    const existing = await Player.findOne({ email: normalizedEmail });

    if (existing) {
      const error = new Error("A player with this email already exists");
      error.statusCode = 409;
      throw error;
    }
  }

  try {
    return await Player.create({
      name: name.trim(),
      email: normalizedEmail,
      phone: phone.trim(),
      dateOfBirth: dateOfBirth || undefined,
      createdBy: userId
    });
  } catch (error) {
    if (error.code === 11000) {
      error.statusCode = 409;
      error.message = "A player with this email already exists";
    }
    throw error;
  }
};

const getPlayers = async (search = "") => {
  const filter = {};

  if (search.trim()) {
    const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");

    filter.$or = [
      { playerId: regex },
      { name: regex },
      { email: regex },
      { phone: regex }
    ];
  }

  return Player.find(filter)
    .select("-__v")
    .sort({ createdAt: -1 })
    .limit(100);
};

const getPlayerById = async (id) => {
  const player = await Player.findById(id).select("-__v");

  if (!player) {
    const error = new Error("Player not found");
    error.statusCode = 404;
    throw error;
  }

  return player;
};

module.exports = { createPlayer, getPlayers, getPlayerById };
