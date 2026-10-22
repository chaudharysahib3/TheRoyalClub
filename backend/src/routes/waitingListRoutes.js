
const express = require("express");
const router = express.Router();

const {
  protect,
  allowRoles
} = require("../middlewares/authMiddleware");

const controller = require("../controllers/waitingListController");

router.use(protect);

const floorStaff = [
  "owner",
  "general_manager",
  "floor_manager"
];

router.get("/", allowRoles(...floorStaff), controller.getAll);
router.post("/", allowRoles(...floorStaff), controller.add);
router.patch("/:id/cancel", allowRoles(...floorStaff), controller.cancel);
router.post("/:id/assign", allowRoles(...floorStaff), controller.assign);

module.exports = router;
