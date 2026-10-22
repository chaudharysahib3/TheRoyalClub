const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const uploadDir = path.join(process.cwd(), "private-uploads", "kyc");
fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`)
});
const allowed = new Set([".pdf", ".jpg", ".jpeg", ".png"]);
const uploadKyc = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.has(ext)) { const error = new Error("Only PDF, JPG and PNG KYC files are allowed"); error.statusCode = 400; return cb(error); }
    cb(null, true);
  }
});
module.exports = { uploadKyc };
