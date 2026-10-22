
const mongoose = require("mongoose");

const membershipPlanSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true
    },
    fee: {
      type: Number,
      required: true,
      min: 0
    },
    validityDays: {
      type: Number,
      required: true,
      min: 1
    },
    benefits: [{
      type: String,
      trim: true
    }],
    active: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "MembershipPlan",
  membershipPlanSchema
);
