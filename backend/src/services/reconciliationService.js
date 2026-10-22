
const DailyReconciliation = require(
  "../models/DailyReconciliation"
);

const {
  getFinancialSummary,
  getDateRange
} = require("./reportService");

const { writeAudit } = require("./auditService");

async function closeDay(data, userId, ipAddress) {
  const {
    businessDate,
    openingCash,
    actualClosingCash,
    notes
  } = data;

  getDateRange(businessDate);

  const opening = Number(openingCash);
  const actual = Number(actualClosingCash);

  if (
    openingCash === undefined ||
    actualClosingCash === undefined ||
    !Number.isFinite(opening) ||
    !Number.isFinite(actual) ||
    opening < 0 ||
    actual < 0
  ) {
    throw new Error(
      "Valid openingCash and actualClosingCash are required"
    );
  }

  const existing = await DailyReconciliation.findOne({
    businessDate
  });

  if (existing) {
    throw new Error(
      "Reconciliation already exists for this date"
    );
  }

  const summary = await getFinancialSummary(businessDate);

  const expectedClosingCash =
    opening +
    summary.totalBuyIn -
    summary.totalCashOut;

  const variance = actual - expectedClosingCash;

  const reconciliation = await DailyReconciliation.create({
    businessDate,
    openingCash: opening,
    totalBuyIn: summary.totalBuyIn,
    totalCashOut: summary.totalCashOut,
    expectedClosingCash,
    actualClosingCash: actual,
    variance,
    status: Math.abs(variance) < 0.005
      ? "balanced"
      : "variance",
    notes: notes || "",
    closedBy: userId
  });

  await writeAudit({
    actor: userId,
    action: "daily_reconciliation_created",
    module: "reconciliation",
    recordId: reconciliation._id,
    description:
      `Daily reconciliation created for ${businessDate}`,
    newValue: {
      expectedClosingCash,
      actualClosingCash: actual,
      variance
    },
    reason: notes || "Daily closing",
    ipAddress
  });

  return reconciliation;
}

async function getReconciliations() {
  return DailyReconciliation.find()
    .populate("closedBy", "name email role")
    .sort({ businessDate: -1 })
    .limit(100);
}

async function getReconciliationByDate(date) {
  getDateRange(date);

  const reconciliation = await DailyReconciliation
    .findOne({ businessDate: date })
    .populate("closedBy", "name email role");

  if (!reconciliation) {
    throw new Error("Reconciliation not found");
  }

  return reconciliation;
}

module.exports = {
  closeDay,
  getReconciliations,
  getReconciliationByDate
};
