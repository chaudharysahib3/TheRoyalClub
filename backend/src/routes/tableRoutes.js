
const express = require("express");
const router = express.Router();

const { protect, allowRoles } = require("../middlewares/authMiddleware");
const tableController = require("../controllers/tableController");

router.use(protect);

const managers = ["owner", "general_manager"];
const floorStaff = ["owner", "general_manager", "floor_manager"];

router.post(
  "/",
  allowRoles(...managers),
  tableController.createTable
);

router.get(
  "/",
  allowRoles(...floorStaff, "cashier", "accountant", "dealer"),
  tableController.getTables
);

router.get(
  "/:id",
  allowRoles(...floorStaff, "cashier", "accountant", "dealer"),
  tableController.getTableById
);

router.patch(
  "/:id/dealer",
  allowRoles(...floorStaff),
  tableController.assignDealer
);

router.patch(
  "/:id/status",
  allowRoles(...floorStaff),
  tableController.updateTableStatus
);

router.post(
  "/:id/seats",
  allowRoles(...floorStaff),
  tableController.seatPlayer
);

router.delete(
  "/:id/seats/:seatNumber",
  allowRoles(...floorStaff),
  tableController.removePlayer
);

module.exports = router;
