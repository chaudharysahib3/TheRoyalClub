
const express = require("express");
const router = express.Router();

const {
  protect,
  allowRoles
} = require("../middlewares/authMiddleware");

const controller = require(
  "../controllers/reconciliationController"
);

router.use(protect);

router.post(
  "/close-day",
  allowRoles("owner", "general_manager", "accountant"),
  controller.closeDay
);

router.get(
  "/",
  allowRoles("owner", "general_manager", "accountant"),
  controller.getAll
);

router.get(
  "/:date",
  allowRoles("owner", "general_manager", "accountant"),
  controller.getByDate
);

module.exports = router;
