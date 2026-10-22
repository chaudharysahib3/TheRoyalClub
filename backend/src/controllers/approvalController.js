
const approvalService = require("../services/approvalService");

exports.create = async (req, res, next) => {
  try {
    const approval = await approvalService.createApproval(
      req.body,
      req.user.id,
      req.ip
    );

    res.status(201).json({
      success: true,
      message: "Approval request created",
      approval
    });
  } catch (error) {
    next(error);
  }
};

exports.getAll = async (req, res, next) => {
  try {
    const approvals = await approvalService.getApprovals(req.query.status);

    res.json({
      success: true,
      count: approvals.length,
      approvals
    });
  } catch (error) {
    next(error);
  }
};

exports.review = async (req, res, next) => {
  try {
    const approval = await approvalService.reviewApproval(
      req.params.id,
      req.body.decision,
      req.user.id,
      req.body.reviewNote,
      req.ip
    );

    res.json({
      success: true,
      message: `Approval ${approval.status}`,
      approval
    });
  } catch (error) {
    next(error);
  }
};
