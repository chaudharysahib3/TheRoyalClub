require("dotenv").config({
  path: require("path").join(__dirname, "../.env")
});

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../src/models/User");

async function createOwner() {
  try {
    if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) {
      throw new Error("MONGODB_URI or JWT_SECRET is missing in .env");
    }

    const name = process.env.OWNER_NAME;
    const email = process.env.OWNER_EMAIL?.toLowerCase();
    const password = process.env.OWNER_PASSWORD;

    if (!name || !email || !password || password.length < 12) {
      throw new Error(
        "Set OWNER_NAME, OWNER_EMAIL and OWNER_PASSWORD (minimum 12 characters) in .env"
      );
    }

    await mongoose.connect(process.env.MONGODB_URI);

    const existingOwner = await User.findOne({ role: "owner" });

    if (existingOwner) {
      throw new Error("An owner account already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await User.create({
      name,
      email,
      password: hashedPassword,
      role: "owner",
      status: "active"
    });

    console.log("Owner account created successfully");
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

createOwner();
