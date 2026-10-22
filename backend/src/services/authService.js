const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Player = require("../models/Player");

const loginUser = async (identifier, password) => {
  const value = String(identifier || "").trim();
  const isEmail = value.includes("@");
  let user = await User.findOne(isEmail
    ? { email: value.toLowerCase() }
    : { phone: value.replace(/[\s()-]/g, "") }
  ).select("+password");
  // Backward compatibility for existing player accounts created before User.phone was added.
  if (!user && !isEmail) {
    const player = await Player.findOne({ phone: value.replace(/[\s()-]/g, "") }).select("email");
    if (player?.email) user = await User.findOne({ email: player.email.toLowerCase() }).select("+password");
  }

  if (!user) {
    throw new Error("Invalid email or password");
  }

  if (user.status !== "active") {
    throw new Error("Your account is inactive");
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    throw new Error("Invalid email or password");
  }

  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  const token = jwt.sign(
    { userId: user._id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

  return {
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role
    }
  };
};

module.exports = { loginUser };
