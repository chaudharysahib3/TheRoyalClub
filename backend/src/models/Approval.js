
const mongoose = require("mongoose");

const approvalSchema = new mongoose.Schema(
  {
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    actionType: {
      type: String,
      required: true,
      trim: true
    },
    module: {
      type: String,
      required: true,
      trim: true
    },
    recordId: {
      type: String,
      default: null
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true
    },
    reviewNote: {
      type: String,
      default: "",
      maxlength: 1000
    },
    reviewedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

approvalSchema.index({ status: 1, createdAt: 1 });

module.exports = mongoose.model("Approval", approvalSchema);
