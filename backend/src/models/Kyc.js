
const mongoose = require("mongoose");

const kycSchema = new mongoose.Schema(
  {
    player: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Player",
      required: true,
      index: true
    },
    documentType: {
      type: String,
      enum: ["government_id", "address_proof", "photo", "other"],
      required: true
    },
    documentRef: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending"
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    reviewedAt: Date,
    reviewNote: {
      type: String,
      maxlength: 500
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Kyc", kycSchema);
