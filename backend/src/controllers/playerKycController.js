const path = require("path");
const Player = require("../models/Player");
const Kyc = require("../models/Kyc");
async function submitMyKyc(req, res, next) {
  try {
    const player = await Player.findOne({ email: String(req.user.email || "").toLowerCase() });
    if (!player) return res.status(404).json({ success: false, message: "Player profile not found" });
    const { documentType } = req.body;
    if (!["government_id", "address_proof", "photo", "other"].includes(documentType)) return res.status(400).json({ success: false, message: "Choose a valid document type" });
    if (!req.file) return res.status(400).json({ success: false, message: "Choose a document to upload" });
    const documentRef = path.relative(process.cwd(), req.file.path).split(path.sep).join("/");
    const record = await Kyc.create({ player: player._id, documentType, documentRef, status: "pending" });
    res.status(201).json({ success: true, message: "KYC document uploaded and submitted for review", record: { _id: record._id, documentType: record.documentType, status: record.status, createdAt: record.createdAt } });
  } catch (e) { if (req.file && e) { /* keep private file for audit/retry; never expose its path */ } next(e); }
}
module.exports = { submitMyKyc };
