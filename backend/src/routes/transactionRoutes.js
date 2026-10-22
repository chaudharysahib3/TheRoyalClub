
const express = require("express");
const router = express.Router();

const {
  createTransaction,
  getTransactions
} = require("../controllers/transactionController");

const {
  protect,
  allowRoles
} = require("../middlewares/authMiddleware");

router.use(protect);

router.post(
  "/",
  allowRoles("owner", "general_manager", "cashier"),
  createTransaction
);

router.get(
  "/",
  allowRoles("owner", "general_manager", "cashier", "accountant"),
  getTransactions
);

module.exports = router;
