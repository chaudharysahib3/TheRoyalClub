const express = require("express");
const router = express.Router();
const { protect, allowRoles } = require("../middlewares/authMiddleware");
const controller = require("../controllers/chipPurchaseRequestController");
router.use(protect, allowRoles("owner", "general_manager", "cashier", "accountant"));
router.get("/", controller.getAll);
router.patch("/:id/review", allowRoles("owner", "general_manager"), controller.review);
module.exports = router;
