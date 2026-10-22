
const mongoose = require("mongoose");

const chipDenominationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true
    },
    value: {
      type: Number,
      required: true,
      min: 0.01
    },
    color: {
      type: String,
      trim: true,
      default: ""
    },
    active: {
      type: Boolean,
      default: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "ChipDenomination",
  chipDenominationSchema
);
