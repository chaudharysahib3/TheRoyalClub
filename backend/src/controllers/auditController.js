
const auditService = require("../services/auditService");

exports.getLogs = async (req, res, next) => {
  try {
    const result = await auditService.getAuditLogs(req.query);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
};