
const express = require("express");
const router = express.Router();

const { protect, allowRoles } = require("../middlewares/authMiddleware");
const controller = require("../controllers/auditController");

router.use(protect);

router.get(
  "/",
  allowRoles("owner", "general_manager", "accountant"),
  controller.getLogs
);

module.exports = router;
