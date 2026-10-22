const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const User = require("../models/User");
const Player = require("../models/Player");
const PendingPlayerRegistration = require("../models/PendingPlayerRegistration");
const nodemailer = require("nodemailer");

const fail = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

function normalizePhone(value) {
  if (typeof value !== "string") return "";
  const phone = value.trim().replace(/[\s()-]/g, "");
  return /^\+?[1-9]\d{9,14}$/.test(phone) ? phone : "";
}

function emailTransport() {
  const emailUser = process.env.EMAIL_USER;
  const emailPassword = process.env.EMAIL_APP_PASSWORD;
  if (!emailUser || !emailPassword) {
    throw fail("Email OTP is not configured. Set EMAIL_USER and EMAIL_APP_PASSWORD in backend/.env.", 503);
  }
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user: emailUser, pass: emailPassword },
  });
}

async function requestPlayerRegistrationOtp({ name, email, phone, password }) {
  if (![name, email, phone, password].every(v => typeof v === "string" && v.trim())) {
    throw fail("Name, email, mobile number and password are required.");
  }
  if (password.length < 8) throw fail("Password must be at least 8 characters long.");
  if (password.length > 128) throw fail("Password must be 128 characters or fewer.");
  const normalizedEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) throw fail("Enter a valid email address.");
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) throw fail("Enter a valid mobile number with country code if needed (10–15 digits).");
  if (name.trim().length > 100) throw fail("Name must be 100 characters or fewer.");

  const existingUser = await User.findOne({ $or: [{ email: normalizedEmail }, { phone: normalizedPhone }] }).select("_id");
  const existingPlayer = await Player.findOne({ $or: [{ email: normalizedEmail }, { phone: normalizedPhone }] }).select("_id");
  if (existingUser || existingPlayer) throw fail("This email or mobile number is already registered.", 409);

  const existingPending = await PendingPlayerRegistration.findOne({ email: normalizedEmail });
  if (existingPending && Date.now() - existingPending.lastSentAt.getTime() < 60_000) {
    throw fail("Please wait 60 seconds before requesting another OTP.", 429);
  }

  const otp = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  const passwordHash = await bcrypt.hash(password, 12);
  const otpHash = crypto.createHash("sha256").update(`${otp}:${process.env.OTP_SECRET || process.env.JWT_SECRET || "trc-otp"}`).digest("hex");
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  // Verify SMTP before saving pending state; never create an active account here.
  const transporter = emailTransport();
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: normalizedEmail,
    subject: "THE ROYALS CLUB — Verify your email",
    text: `Your THE ROYALS CLUB verification code is ${otp}. It expires in 10 minutes. If you did not request this, ignore this email.`,
    html: `<div style="font-family:Arial,sans-serif;background:#111;color:#eee;padding:28px"><h2 style="color:#d5b56b">THE ROYALS CLUB</h2><p>Your email verification code is:</p><div style="font-size:32px;letter-spacing:8px;font-weight:bold;color:#d5b56b;padding:16px 0">${otp}</div><p>This code expires in 10 minutes. Never share it with anyone.</p></div>`,
  });

  await PendingPlayerRegistration.findOneAndUpdate(
    { email: normalizedEmail },
    { name: name.trim(), email: normalizedEmail, phone: normalizedPhone, passwordHash, otpHash, expiresAt, attempts: 0, lastSentAt: new Date() },
    { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
  );
  return { email: normalizedEmail, message: "Verification OTP sent. Check your email and verify it within 10 minutes." };
}

async function verifyPlayerRegistrationOtp({ email, otp }) {
  if (typeof email !== "string" || typeof otp !== "string" || !/^\d{6}$/.test(otp.trim())) {
    throw fail("Enter the email address and 6-digit OTP.");
  }
  const normalizedEmail = email.trim().toLowerCase();
  const pending = await PendingPlayerRegistration.findOne({ email: normalizedEmail });
  if (!pending) throw fail("No pending registration found. Please register again.", 404);
  if (pending.expiresAt.getTime() < Date.now()) {
    await PendingPlayerRegistration.deleteOne({ _id: pending._id });
    throw fail("OTP has expired. Please register again to receive a new OTP.", 400);
  }
  if (pending.attempts >= 5) {
    await PendingPlayerRegistration.deleteOne({ _id: pending._id });
    throw fail("Too many incorrect attempts. Please register again.", 429);
  }
  const candidateHash = crypto.createHash("sha256").update(`${otp.trim()}:${process.env.OTP_SECRET || process.env.JWT_SECRET || "trc-otp"}`).digest("hex");
  if (!crypto.timingSafeEqual(Buffer.from(candidateHash), Buffer.from(pending.otpHash))) {
    pending.attempts += 1;
    await pending.save();
    throw fail("Incorrect OTP. Please try again.", 400);
  }

  const existingUser = await User.findOne({ $or: [{ email: pending.email }, { phone: pending.phone }] }).select("_id");
  const existingPlayer = await Player.findOne({ $or: [{ email: pending.email }, { phone: pending.phone }] }).select("_id");
  if (existingUser || existingPlayer) {
    await PendingPlayerRegistration.deleteOne({ _id: pending._id });
    throw fail("This email or mobile number is already registered.", 409);
  }

  let user;
  try {
    user = await User.create({ name: pending.name, email: pending.email, phone: pending.phone, password: pending.passwordHash, role: "player", status: "active" });
    const player = await Player.create({ name: pending.name, email: pending.email, phone: pending.phone, createdBy: user._id });
    await PendingPlayerRegistration.deleteOne({ _id: pending._id });
    return { user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role }, player };
  } catch (error) {
    if (user?._id) await User.deleteOne({ _id: user._id });
    if (error.code === 11000) throw fail("This email or mobile number is already registered.", 409);
    throw error;
  }
}

module.exports = { requestPlayerRegistrationOtp, verifyPlayerRegistrationOtp, normalizePhone };
