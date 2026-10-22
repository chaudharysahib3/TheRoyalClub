const crypto = require("crypto");
const mongoose = require("mongoose");
const Payment = require("../models/Payment");
const ChipPurchaseRequest = require("../models/ChipPurchaseRequest");
const Player = require("../models/Player");
const Kyc = require("../models/Kyc");
const ChipPurchaseCredit = require("../models/ChipPurchaseCredit");
const GatewayWebhookEvent = require("../models/GatewayWebhookEvent");
const { writeAudit } = require("./auditService");

function config() {
  const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET, RAZORPAY_CHIP_RATE } = process.env;
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET || !RAZORPAY_WEBHOOK_SECRET) {
    const e = new Error("Razorpay is not configured. Set the server-side Razorpay keys and webhook secret."); e.statusCode = 503; throw e;
  }
  // Business rule: ₹1 = 1 chip. Never trust a client-supplied conversion rate.
  const rate = 1;
  const environment = RAZORPAY_KEY_ID.startsWith("rzp_test_") ? "test" : RAZORPAY_KEY_ID.startsWith("rzp_live_") ? "live" : "unknown";
  return { keyId: RAZORPAY_KEY_ID, keySecret: RAZORPAY_KEY_SECRET, webhookSecret: RAZORPAY_WEBHOOK_SECRET, rate, environment };
}

async function assertTransactionsAvailable() {
  // Fail before creating a real checkout order when MongoDB cannot guarantee atomic
  // payment/request/ledger updates. This prevents collecting money while the app
  // cannot safely record verification or prevent duplicate chip credits.
  try {
    const hello = await mongoose.connection.db.admin().command({ hello: 1 });
    if (!hello.setName && !hello.msg?.includes('isdbgrid')) {
      const e = new Error('Payments are temporarily disabled because MongoDB transactions are unavailable. Configure MongoDB as a replica set (local rs0) or use a transaction-capable MongoDB Atlas cluster, then restart the backend.');
      e.statusCode = 503;
      throw e;
    }
  } catch (err) {
    if (err.statusCode) throw err;
    const e = new Error('Could not confirm MongoDB transaction support. Payments are disabled for safety; check the database connection and replica-set configuration.');
    e.statusCode = 503;
    throw e;
  }
}

function hmacHex(secret, value) { return crypto.createHmac("sha256", secret).update(value).digest("hex"); }
function safeEqualHex(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || !/^[a-f0-9]+$/i.test(a) || !/^[a-f0-9]+$/i.test(b)) return false;
  const aa = Buffer.from(a, "hex"), bb = Buffer.from(b, "hex");
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}
async function gatewayRequest(path, method = "GET", body) {
  const { keyId, keySecret } = config();
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    method, headers: { Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const e = new Error(data.error?.description || "Razorpay API request failed"); e.statusCode = response.status >= 500 ? 502 : 400; throw e;
  }
  return data;
}
async function createOrder(playerUser, amount, idempotencyKey) {
  const { rate, environment } = config();
  await assertTransactionsAvailable();
  const player = await Player.findOne({ email: String(playerUser.email || "").toLowerCase(), status: "active" });
  if (!player) { const e = new Error("Active player profile not found"); e.statusCode = 404; throw e; }
  if (!(await Kyc.exists({ player: player._id, status: "approved" }))) { const e = new Error("Approved KYC is required before purchasing chips"); e.statusCode = 403; throw e; }
  const value = Number(amount);
  if (!Number.isFinite(value) || value < 1 || value > 10000000 || Math.round(value * 100) !== value * 100 || !Number.isInteger(value)) {
    const e = new Error("Enter a valid purchase amount from ₹1 to ₹1,00,00,000 (whole rupee amounts only)"); e.statusCode = 400; throw e;
  }
  const amountPaise = Math.round(value * 100);
  if (typeof idempotencyKey !== "string" || !/^[A-Za-z0-9._:-]{16,128}$/.test(idempotencyKey)) {
    const e = new Error("A valid Idempotency-Key header (16–128 safe characters) is required"); e.statusCode = 400; throw e;
  }
  let request;
  try {
    request = await ChipPurchaseRequest.create({
      player: player._id, amount: value, mode: "razorpay", status: "payment_pending", idempotencyKey,
      note: "Razorpay payment required. Chips are not credited until payment verification and owner approval."
    });
  } catch (err) {
    if (err.code !== 11000) throw err;
    request = await ChipPurchaseRequest.findOne({ idempotencyKey });
    if (!request || String(request.player) !== String(player._id) || request.amount !== value || request.mode !== "razorpay") {
      const e = new Error("Idempotency key was already used for a different request"); e.statusCode = 409; throw e;
    }
    const existingPayment = await Payment.findOne({ request: request._id });
    if (existingPayment) return { request, payment: existingPayment, keyId: config().keyId, chipRate: rate };
    if (request.status === "payment_setup_failed") {
      const retryOrder = await gatewayRequest("/orders", "POST", {
        amount: amountPaise, currency: "INR", receipt: request.requestRef,
        notes: { purchaseRequestId: request._id.toString(), playerId: player.playerId }
      });
      const retryPayment = await Payment.create({ request: request._id, player: player._id, orderId: retryOrder.id, amountPaise, currency: "INR", status: "created", environment, statusHistory: [{ status: "created", source: "order_created", note: `Razorpay ${environment} order created` }] });
      request.gatewayOrderId = retryOrder.id; request.status = "payment_pending";
      request.note = "Razorpay order recreated after a previous setup failure. Chips require verified payment and owner approval.";
      await request.save();
      return { request, payment: retryPayment, keyId: config().keyId, chipRate: rate };
    }
    const e = new Error("This purchase request is still being initialized; retry with the same Idempotency-Key shortly"); e.statusCode = 409; throw e;
  }
  try {
    const order = await gatewayRequest("/orders", "POST", {
      amount: amountPaise, currency: "INR", receipt: request.requestRef,
      notes: { purchaseRequestId: request._id.toString(), playerId: player.playerId }
    });
    const payment = await Payment.create({ request: request._id, player: player._id, orderId: order.id, amountPaise, currency: "INR", status: "created", environment, statusHistory: [{ status: "created", source: "order_created", note: `Razorpay ${environment} order created` }] });
    request.gatewayOrderId = order.id;
    await request.save();
    return { request, payment, keyId: config().keyId, chipRate: rate };
  } catch (err) {
    await ChipPurchaseRequest.updateOne({ _id: request._id, status: "payment_pending" }, { $set: { status: "payment_setup_failed", reviewNote: "Gateway order could not be created; no chip credit was issued." } });
    throw err;
  }
}
async function verifyCheckout(user, body) {
  const { keySecret } = config();
  await assertTransactionsAvailable();
  const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = body || {};
  if (![orderId, paymentId, signature].every(x => typeof x === "string" && x.length > 0)) {
    const e = new Error("Missing Razorpay checkout verification fields"); e.statusCode = 400; throw e;
  }
  const payment = await Payment.findOne({ orderId });
  if (!payment) { const e = new Error("Payment order not found"); e.statusCode = 404; throw e; }
  const expected = hmacHex(keySecret, `${orderId}|${paymentId}`);
  if (!safeEqualHex(expected, signature)) { const e = new Error("Invalid Razorpay payment signature"); e.statusCode = 400; throw e; }
  const gatewayPayment = await gatewayRequest(`/payments/${encodeURIComponent(paymentId)}`);
  if (gatewayPayment.order_id !== orderId || Number(gatewayPayment.amount) !== payment.amountPaise || gatewayPayment.currency !== payment.currency) {
    const e = new Error("Gateway payment order, amount or currency mismatch"); e.statusCode = 409; throw e;
  }
  if (gatewayPayment.status !== "captured") {
    const e = new Error(`Payment is not captured yet (gateway status: ${gatewayPayment.status})`); e.statusCode = 409; throw e;
  }
  if (String(payment.player) !== String((await Player.findOne({ email: String(user.email || "").toLowerCase() }))?._id)) {
    const e = new Error("This payment order does not belong to the signed-in player"); e.statusCode = 403; throw e;
  }
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const fresh = await Payment.findOne({ _id: payment._id }).session(session);
      if (!fresh) throw new Error("Payment record not found");
      if (fresh.status === "paid_verified" || fresh.status === "authorized") {
        if (fresh.paymentId !== paymentId) throw new Error("Payment order already linked to another payment ID");
        return;
      }
      if (fresh.paymentId && fresh.paymentId !== paymentId) throw new Error("Payment order already linked to another payment ID");
      fresh.paymentId = paymentId;
      fresh.status = "paid_verified";
      fresh.statusHistory.push({ status: "paid_verified", source: "checkout_verification", note: "Signature valid and gateway reports captured payment" });
      fresh.checkoutSignatureVerifiedAt = new Date();
      fresh.gatewayCapturedAt = gatewayPayment.created_at ? new Date(gatewayPayment.created_at * 1000) : new Date();
      fresh.rawStatus = gatewayPayment.status;
      await fresh.save({ session });
      await ChipPurchaseRequest.updateOne({ _id: fresh.request, status: "payment_pending" }, { $set: { status: "awaiting_owner_approval", note: "Payment verified with Razorpay. Awaiting owner approval; chips not yet credited." } }, { session });
      await writeAudit({ actor: null, action: "razorpay_payment_verified", module: "payments", recordId: fresh._id, description: "Razorpay captured payment verified; awaiting owner approval", newValue: { orderId, paymentId, amountPaise: fresh.amountPaise }, ipAddress: null, session });
    });
  } finally { await session.endSession(); }
  return { verified: true, message: "Payment verified. Chips will be credited only after owner approval." };
}
async function handleWebhook(rawBody, signature, eventId) {
  const { webhookSecret } = config();
  if (!Buffer.isBuffer(rawBody)) { const e = new Error("Raw webhook body is required for signature verification"); e.statusCode = 400; throw e; }
  const expected = hmacHex(webhookSecret, rawBody);
  if (!safeEqualHex(expected, signature)) { const e = new Error("Invalid Razorpay webhook signature"); e.statusCode = 400; throw e; }
  let event;
  try { event = JSON.parse(rawBody.toString("utf8")); } catch (_) { const e = new Error("Invalid JSON webhook payload"); e.statusCode = 400; throw e; }
  const id = eventId || event.id || null;
  if (id && await GatewayWebhookEvent.exists({ eventId: id })) return { duplicate: true };
  const entity = event.payload?.payment?.entity;
  if (!entity?.order_id || !entity?.id) return { ignored: true };
  const payment = await Payment.findOne({ orderId: entity.order_id });
  if (!payment) return { ignored: true };
  if (Number(entity.amount) !== payment.amountPaise || entity.currency !== payment.currency) {
    const e = new Error("Webhook amount or currency mismatch"); e.statusCode = 409; throw e;
  }
  if (event.event === "payment.failed" || entity.status === "failed") {
    await assertTransactionsAvailable();
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const fresh = await Payment.findOne({ _id: payment._id }).session(session);
        if (!fresh || ["paid_verified", "authorized"].includes(fresh.status)) return;
        // A Razorpay order may have multiple failed attempts before a successful capture.
        // Do not bind the canonical paymentId to a failed attempt or block later retries.
        fresh.status = "failed"; fresh.rawStatus = entity.status;
        fresh.statusHistory.push({ status: "failed", source: "razorpay_webhook", note: "Gateway reported a failed payment attempt" });
        if (id) fresh.lastGatewayEventId = id;
        await fresh.save({ session });
      });
    } finally { await session.endSession(); }
    if (id) { try { await GatewayWebhookEvent.create({ eventId: id, event: event.event || "unknown" }); } catch (err) { if (err.code !== 11000) throw err; } }
    return { received: true };
  }
  if (event.event === "payment.captured" || entity.status === "captured") {
    await assertTransactionsAvailable();
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const fresh = await Payment.findOne({ _id: payment._id }).session(session);
        if (!fresh) return;
        if (fresh.paymentId && fresh.paymentId !== entity.id) throw new Error("Conflicting payment ID for Razorpay order");
        if (fresh.status !== "paid_verified" && fresh.status !== "authorized") {
          fresh.paymentId = entity.id; fresh.status = "paid_verified"; fresh.gatewayCapturedAt = new Date(); fresh.rawStatus = entity.status;
          fresh.statusHistory.push({ status: "paid_verified", source: "razorpay_webhook", note: "Webhook signature valid; gateway reported captured payment" });
          await fresh.save({ session });
          await ChipPurchaseRequest.updateOne({ _id: fresh.request, status: "payment_pending" }, { $set: { status: "awaiting_owner_approval", note: "Payment verified with Razorpay webhook. Awaiting owner approval; chips not yet credited." } }, { session });
        }
        if (id) { fresh.lastGatewayEventId = id; await fresh.save({ session }); }
      });
    } finally { await session.endSession(); }
  }
  if (id) { try { await GatewayWebhookEvent.create({ eventId: id, event: event.event || "unknown" }); } catch (err) { if (err.code === 11000) return { duplicate: true }; throw err; } }
  return { received: true };
}
async function approvePurchase(id, reviewNote, reviewerId, ipAddress) {
  await assertTransactionsAvailable();
  if (!mongoose.isValidObjectId(id)) { const e = new Error("Invalid purchase request ID"); e.statusCode = 400; throw e; }
  if (typeof reviewNote !== "string" || !reviewNote.trim() || reviewNote.length > 500) { const e = new Error("Approval note/reason is required (up to 500 characters)"); e.statusCode = 400; throw e; }
  const { rate } = config();
  const session = await mongoose.startSession();
  let result;
  try {
    await session.withTransaction(async () => {
      const request = await ChipPurchaseRequest.findOneAndUpdate(
        { _id: id, status: "awaiting_owner_approval", mode: "razorpay" },
        { $set: { status: "approved", reviewedAt: new Date(), reviewNote: reviewNote.trim() } },
        { new: true, session }
      );
      if (!request) {
        const already = await ChipPurchaseRequest.findById(id).session(session);
        if (already?.status === "approved" && await ChipPurchaseCredit.exists({ request: id }).session(session)) {
          result = { request: already, duplicate: true }; return;
        }
        const e = new Error("Request is not awaiting approval; payment must be verified and request must be pending"); e.statusCode = 409; throw e;
      }
      const payment = await Payment.findOne({ request: request._id, status: "paid_verified" }).session(session);
      if (!payment || !payment.paymentId) { const e = new Error("Captured and verified Razorpay payment is required before approval"); e.statusCode = 409; throw e; }
      const player = await Player.findById(request.player).session(session);
      if (!player || player.status !== "active") { const e = new Error("Player is not active"); e.statusCode = 409; throw e; }
      if (!(await Kyc.exists({ player: player._id, status: "approved" }).session(session))) { const e = new Error("Approved KYC is required at approval time"); e.statusCode = 403; throw e; }
      const chipsCredited = Math.round(request.amount * rate * 10000) / 10000;
      const credit = await ChipPurchaseCredit.create([{
        request: request._id, payment: payment._id, player: player._id, amountInr: request.amount,
        chipRate: rate, chipsCredited, environment: payment.environment || "unknown", approvedBy: reviewerId, approvedAt: new Date(),
        reference: `TRC-CHIP-CREDIT-${request.requestRef}`
      }], { session });
      await writeAudit({ actor: reviewerId, action: "razorpay_chip_purchase_approved", module: "chip_purchase_requests", recordId: request._id, description: "Verified Razorpay purchase approved and chip credit ledger entry created", oldValue: { status: "awaiting_owner_approval" }, newValue: { status: "approved", amountInr: request.amount, chipsCredited, creditId: credit[0]._id.toString() }, reason: reviewNote.trim(), ipAddress, session });
      result = { request, credit: credit[0], duplicate: false };
    });
  } finally { await session.endSession(); }
  return result;
}
async function rejectPurchase(id, reviewNote, reviewerId, ipAddress) {
  if (!mongoose.isValidObjectId(id)) { const e = new Error("Invalid purchase request ID"); e.statusCode = 400; throw e; }
  if (typeof reviewNote !== "string" || !reviewNote.trim() || reviewNote.length > 500) { const e = new Error("Rejection reason is required (up to 500 characters)"); e.statusCode = 400; throw e; }
  const request = await ChipPurchaseRequest.findOneAndUpdate(
    { _id: id, status: "awaiting_owner_approval", mode: "razorpay" },
    { $set: { status: "rejected", reviewedAt: new Date(), reviewNote: reviewNote.trim() } },
    { new: true }
  );
  if (!request) { const e = new Error("Request is not awaiting approval"); e.statusCode = 409; throw e; }
  await writeAudit({ actor: reviewerId, action: "razorpay_chip_purchase_rejected", module: "chip_purchase_requests", recordId: request._id, description: "Verified payment purchase rejected by owner; refund/reconciliation required", reason: reviewNote.trim(), ipAddress });
  return request;
}
async function listCredits(playerId) {
  return ChipPurchaseCredit.find(playerId ? { player: playerId } : {}).populate("player", "name playerId").populate("approvedBy", "name email").sort({ createdAt: -1 }).limit(200).lean();
}
module.exports = { createOrder, verifyCheckout, handleWebhook, approvePurchase, rejectPurchase, listCredits };
