
const mongoose = require("mongoose");

const chipLocationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      enum: ["vault", "cashier", "table"],
      required: true
    },
    tableId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Table",
      default: null
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

chipLocationSchema.index({ name: 1, type: 1 }, { unique: true });

module.exports = mongoose.model("ChipLocation", chipLocationSchema);
