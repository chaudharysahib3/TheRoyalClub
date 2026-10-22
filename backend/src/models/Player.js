
const mongoose = require("mongoose");

const playerSchema = new mongoose.Schema(
  {
    playerId: {
      type: String,
      unique: true,
      index: true
    },
    membershipId: {
      type: String,
      unique: true,
      sparse: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      sparse: true,
      unique: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    dateOfBirth: {
      type: Date
    },
    status: {
      type: String,
      enum: ["active", "inactive", "blocked"],
      default: "active"
    },
    membershipStatus: {
      type: String,
      enum: ["none", "pending", "active", "expired"],
      default: "none"
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  { timestamps: true }
);

playerSchema.pre("validate", async function () {
  if (!this.playerId && this.isNew) {
    this.playerId =
      "TRC-" + new mongoose.Types.ObjectId().toString().slice(-8).toUpperCase();
  }
  if (!this.membershipId && this.isNew) {
    this.membershipId = "TRC-M-" + new mongoose.Types.ObjectId().toString().slice(-8).toUpperCase();
  }
});

module.exports = mongoose.model("Player", playerSchema);
