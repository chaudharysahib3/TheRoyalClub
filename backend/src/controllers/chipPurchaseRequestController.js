const service = require("../services/chipPurchaseRequestService");
exports.getAll = async (req, res, next) => {
  try {
    const requests = await service.getRequests(req.query.status);
    res.json({ success: true, count: requests.length, requests });
  } catch (e) { next(e); }
};
exports.review = async (req, res, next) => {
  try {
    const request = await service.reviewRequest(req.params.id, req.body.decision, req.body.reviewNote, req.user.id, req.ip);
    res.json({
      success: true,
      message: request.status === "approved_demo"
        ? "Demo request approved for tracking only. No chips were credited."
        : "Demo purchase request rejected.",
      request
    });
  } catch (e) { next(e); }
};
