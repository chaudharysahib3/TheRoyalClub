
const express = require("express");
const router = express.Router();

const { protect, allowRoles } = require("../middlewares/authMiddleware");
const controller = require("../controllers/approvalController");

router.use(protect);

router.post(
  "/",
  allowRoles("owner", "general_manager", "floor_manager", "cashier"),
  controller.create
);

router.get(
  "/",
  allowRoles("owner", "general_manager", "accountant"),
  controller.getAll
);

router.patch(
  "/:id/review",
  allowRoles("owner", "general_manager"),
  controller.review
);

module.exports = router;
