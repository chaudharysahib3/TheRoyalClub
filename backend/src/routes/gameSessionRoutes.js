
const express = require("express");
const router = express.Router();

const {
  protect,
  allowRoles
} = require("../middlewares/authMiddleware");

const controller = require("../controllers/gameSessionController");

router.use(protect);

const sessionStaff = [
  "owner",
  "general_manager",
  "floor_manager",
  "cashier"
];

router.get("/", allowRoles(...sessionStaff, "accountant"), controller.getAll);
router.get("/:id", allowRoles(...sessionStaff, "accountant"), controller.getOne);
router.post("/", allowRoles(...sessionStaff), controller.start);
router.patch("/:id/end", allowRoles(...sessionStaff), controller.end);

module.exports = router;
