
const AuditLog = require("../models/AuditLog");

async function writeAudit({
  actor,
  action,
  module,
  recordId = null,
  description,
  oldValue = null,
  newValue = null,
  reason = "",
  ipAddress = null,
  outcome = "success",
  session = null
}) {
  const payload = {
    actor: actor || null,
    action,
    module,
    recordId: recordId ? String(recordId) : null,
    description,
    oldValue,
    newValue,
    reason,
    ipAddress,
    outcome
  };
  if (session) {
    const records = await AuditLog.create([payload], { session });
    return records[0];
  }
  return AuditLog.create(payload);
}

async function getAuditLogs(filters = {}) {
  const query = {};

  if (filters.module) query.module = filters.module;
  if (filters.action) query.action = filters.action;
  if (filters.actor) query.actor = filters.actor;

  if (filters.from || filters.to) {
    query.createdAt = {};
    if (filters.from) query.createdAt.$gte = new Date(filters.from);
    if (filters.to) query.createdAt.$lte = new Date(filters.to);
  }

  const page = Math.max(1, Number(filters.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(filters.limit) || 25));

  const [logs, total] = await Promise.all([
    AuditLog.find(query)
      .populate("actor", "name email role")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    AuditLog.countDocuments(query)
  ]);

  return {
    logs,
    total,
    page,
    pages: Math.ceil(total / limit)
  };
}

module.exports = { writeAudit, getAuditLogs };
