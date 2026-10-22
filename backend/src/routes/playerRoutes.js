
const express = require("express");
const router = express.Router();

const {
  createPlayer,
  getPlayers,
  getPlayerById
} = require("../controllers/playerController");

const { protect, allowRoles } = require("../middlewares/authMiddleware");

router.use(protect);
router.use(allowRoles("owner", "general_manager", "floor_manager", "cashier", "accountant", "dealer", "kyc_compliance"));

router.post("/", createPlayer);
router.get("/", getPlayers);
router.get("/:id", getPlayerById);

module.exports = router;
