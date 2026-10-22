
const express = require("express");
const router = express.Router();

const { protect, allowRoles } = require("../middlewares/authMiddleware");
const chipController = require("../controllers/chipController");

router.use(protect);

const managers = ["owner", "general_manager"];
const operators = ["owner", "general_manager", "floor_manager", "cashier"];
const viewers = [
  "owner",
  "general_manager",
  "floor_manager",
  "cashier",
  "accountant"
];

router.post(
  "/denominations",
  allowRoles(...managers),
  chipController.createDenomination
);

router.get(
  "/denominations",
  allowRoles(...viewers),
  chipController.getDenominations
);

router.post(
  "/locations",
  allowRoles(...managers),
  chipController.createLocation
);

router.get(
  "/locations",
  allowRoles(...viewers),
  chipController.getLocations
);

router.post(
  "/movements",
  allowRoles(...operators),
  chipController.recordMovement
);

router.get(
  "/ledger",
  allowRoles(...viewers),
  chipController.getLedger
);

router.get(
  "/inventory",
  allowRoles(...viewers),
  chipController.getInventory
);

module.exports = router;
