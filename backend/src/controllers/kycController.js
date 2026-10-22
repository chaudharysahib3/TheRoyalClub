const path = require("path");
const fs = require("fs");
const Kyc = require("../models/Kyc");
const kycService = require("../services/kycService");

const submitKyc = async (req, res, next) => {
  try {
    const record = await kycService.submitKyc(req.body);
    res.status(201).json({ success: true, message: "KYC submitted successfully", kyc: record });
  } catch (error) { next(error); }
};

const getKycRecords = async (req, res, next) => {
  try {
    const records = await kycService.getKycRecords(req.query.status);
    res.json({ success: true, count: records.length, records });
  } catch (error) { next(error); }
};

const reviewKyc = async (req, res, next) => {
  try {
    const record = await kycService.reviewKyc(req.params.id, req.body.status, req.body.note, req.user.id);
    res.json({ success: true, message: "KYC reviewed successfully", kyc: record });
  } catch (error) { next(error); }
};

// Only authorized KYC reviewers reach this controller through the protected route.
const viewDocument = async (req, res, next) => {
  try {
    const record = await Kyc.findById(req.params.id).select("documentRef documentType");
    if (!record || !record.documentRef) return res.status(404).json({ success: false, message: "KYC document not found" });
    const root = path.resolve(process.cwd(), "private-uploads", "kyc");
    const fullPath = path.resolve(process.cwd(), record.documentRef);
    if (!fullPath.startsWith(root + path.sep) || !fs.existsSync(fullPath)) {
      return res.status(404).json({ success: false, message: "Stored KYC document is unavailable" });
    }
    const ext = path.extname(fullPath).toLowerCase();
    const types = { ".pdf": "application/pdf", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png" };
    if (!types[ext]) return res.status(415).json({ success: false, message: "Unsupported document format" });
    res.setHeader("Content-Type", types[ext]);
    res.setHeader("Content-Disposition", `inline; filename="kyc-${record._id}${ext}"`);
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    fs.createReadStream(fullPath).pipe(res);
  } catch (error) { next(error); }
};

module.exports = { submitKyc, getKycRecords, reviewKyc, viewDocument };
