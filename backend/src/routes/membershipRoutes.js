
const express = require("express");
const router = express.Router();

const {
  createPlan,
  getPlans,
  assignMembership,
  getMemberships
} = require("../controllers/membershipController");

const {
  protect,
  allowRoles
} = require("../middlewares/authMiddleware");

router.use(protect);

router.get(
  "/plans",
  allowRoles(
    "owner",
    "general_manager",
    "floor_manager",
    "cashier",
    "kyc_compliance"
  ),
  getPlans
);

router.post(
  "/plans",
  allowRoles("owner", "general_manager"),
  createPlan
);

router.post(
  "/assign",
  allowRoles("owner", "general_manager", "cashier"),
  assignMembership
);

router.get(
  "/",
  allowRoles("owner", "general_manager", "cashier", "accountant"),
  getMemberships
);

module.exports = router;
