const express = require("express");
const cors = require("cors");

const homeRoutes = require("./routes/homeRoutes");
const authRoutes = require("./routes/authRoutes");
const staffRoutes = require("./routes/staffRoutes");
const playerRoutes = require("./routes/playerRoutes");
const playerPortalRoutes = require("./routes/playerPortalRoutes");
const kycRoutes = require("./routes/kycRoutes");
const membershipRoutes = require("./routes/membershipRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const chipRoutes = require("./routes/chipRoutes");
const tableRoutes = require("./routes/tableRoutes");
const waitingListRoutes = require("./routes/waitingListRoutes");
const gameSessionRoutes = require("./routes/gameSessionRoutes");
const auditRoutes = require("./routes/auditRoutes");
const approvalRoutes = require("./routes/approvalRoutes");
const reportRoutes = require("./routes/reportRoutes");
const reconciliationRoutes = require("./routes/reconciliationRoutes");
const chipPurchaseRequestRoutes = require("./routes/chipPurchaseRequestRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const paymentController = require("./controllers/paymentController");

const errorMiddleware = require("./middlewares/errorMiddleware");

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000"
}));

// Razorpay webhook signatures require the exact raw request bytes; mount before JSON parsing.
app.post("/api/payments/razorpay/webhook", express.raw({ type: "application/json", limit: "1mb" }), paymentController.webhook);
app.use(express.json({ limit: "1mb" }));

app.use("/api", homeRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/players", playerRoutes);
app.use("/api/player-portal", playerPortalRoutes);
app.use("/api/kyc", kycRoutes);
app.use("/api/memberships", membershipRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/chips", chipRoutes);
app.use("/api/tables", tableRoutes);
app.use("/api/waiting-list", waitingListRoutes);
app.use("/api/game-sessions", gameSessionRoutes);
app.use("/api/audit-logs", auditRoutes);
app.use("/api/approvals", approvalRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/reconciliation", reconciliationRoutes);
app.use("/api/chip-purchase-requests", chipPurchaseRequestRoutes);
app.use("/api/payments", paymentRoutes);

app.use(errorMiddleware);

module.exports = app;