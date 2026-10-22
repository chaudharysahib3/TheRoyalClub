
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const STAFF_ROLES = [
  "general_manager",
  "floor_manager",
  "cashier",
  "kyc_compliance",
  "dealer",
  "marketing_manager",
  "accountant"
];

const createStaff = async (data) => {
  const { name, email, password, role } = data;

  if (
    typeof name !== "string" ||
    !name.trim() ||
    typeof email !== "string" ||
    !email.trim() ||
    typeof password !== "string" ||
    password.length < 12 ||
    !STAFF_ROLES.includes(role)
  ) {
    const error = new Error(
      "Valid name, email, role and password of at least 12 characters are required"
    );
    error.statusCode = 400;
    throw error;
  }

  const normalizedEmail = email.trim().toLowerCase();

  const existing = await User.findOne({ email: normalizedEmail });

  if (existing) {
    const error = new Error("Email already registered");
    error.statusCode = 409;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  return User.create({
    name: name.trim(),
    email: normalizedEmail,
    password: hashedPassword,
    role,
    status: "active"
  });
};

const getStaff = async () => {
  return User.find({ role: { $nin: ["owner", "player"] } })
    .select("name email role status createdAt")
    .sort({ createdAt: -1 });
};

const updateStaff = async (id, data) => {
  const staff = await User.findOne({
    _id: id,
    role: { $nin: ["owner", "player"] }
  });

  if (!staff) {
    const error = new Error("Staff member not found");
    error.statusCode = 404;
    throw error;
  }

  if (data.role !== undefined) {
    if (!STAFF_ROLES.includes(data.role)) {
      const error = new Error("Invalid staff role");
      error.statusCode = 400;
      throw error;
    }

    staff.role = data.role;
  }

  if (data.status !== undefined) {
    if (!["active", "inactive"].includes(data.status)) {
      const error = new Error("Invalid account status");
      error.statusCode = 400;
      throw error;
    }

    staff.status = data.status;
  }

  await staff.save();

  return {
    id: staff._id,
    name: staff.name,
    email: staff.email,
    role: staff.role,
    status: staff.status
  };
};

module.exports = { createStaff, getStaff, updateStaff };
