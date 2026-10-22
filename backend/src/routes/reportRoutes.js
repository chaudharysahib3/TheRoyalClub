
const express = require("express");
const router = express.Router();

const {
  protect,
  allowRoles
} = require("../middlewares/authMiddleware");

const controller = require(
  "../controllers/reportController"
);

router.use(protect);

router.get(
  "/dashboard",
  allowRoles("owner", "general_manager", "accountant"),
  controller.dashboard
);

router.get(
  "/financial",
  allowRoles("owner", "general_manager", "accountant"),
  controller.financial
);

router.get(
  "/sessions",
  allowRoles(
    "owner",
    "general_manager",
    "floor_manager",
    "accountant"
  ),
  controller.sessions
);

router.get(
  "/chips",
  allowRoles(
    "owner",
    "general_manager",
    "accountant"
  ),
  controller.chips
);

module.exports = router;
