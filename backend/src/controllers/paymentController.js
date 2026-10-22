const service = require("../services/razorpayService");
exports.createOrder = async (req, res, next) => {
  try {
    const result = await service.createOrder(req.user, req.body.amount, req.get("Idempotency-Key"));
    res.status(201).json({
      success: true, keyId: result.keyId, orderId: result.payment.orderId,
      amount: result.payment.amountPaise, currency: result.payment.currency,
      request: { _id: result.request._id, requestRef: result.request.requestRef, status: result.request.status },
      chipRate: result.chipRate, message: "Razorpay order created. Complete checkout; chips require owner approval."
    });
  } catch (e) { next(e); }
};
exports.verifyCheckout = async (req, res, next) => {
  try {
    const result = await service.verifyCheckout(req.user, req.body);
    res.json({ success: true, ...result });
  } catch (e) {
    // Keep a useful server-side trace for payment verification failures without logging secrets.
    console.error("Razorpay checkout verification failed:", e.statusCode || 500, e.message);
    next(e);
  }
};
exports.webhook = async (req, res) => {
  try {
    const result = await service.handleWebhook(req.body, req.get("x-razorpay-signature"), req.get("x-razorpay-event-id"));
    res.status(200).json({ success: true, ...result });
  } catch (e) {
    console.error("Razorpay webhook rejected:", e.message);
    res.status(e.statusCode || 500).json({ success: false, message: e.message });
  }
};
exports.approve = async (req, res, next) => {
  try {
    const result = await service.approvePurchase(req.params.id, req.body.reviewNote, req.user.id, req.ip);
    res.json({ success: true, duplicate: result.duplicate || false, message: result.duplicate ? "This purchase was already credited; no duplicate credit created." : "Payment approved and chip credit ledger entry created.", request: result.request, credit: result.credit || null });
  } catch (e) { next(e); }
};
exports.reject = async (req, res, next) => {
  try {
    const request = await service.rejectPurchase(req.params.id, req.body.reviewNote, req.user.id, req.ip);
    res.json({ success: true, message: "Purchase rejected. Since payment was captured, refund/reconciliation is required; no chips were credited.", request });
  } catch (e) { next(e); }
};
exports.credits = async (req, res, next) => {
  try { const rows = await service.listCredits(); res.json({ success: true, credits: rows }); }
  catch (e) { next(e); }
};
