
const express = require("express");
const router = express.Router();

const {
  createStaff,
  getStaff,
  updateStaff
} = require("../controllers/staffController");

const {
  protect,
  allowRoles
} = require("../middlewares/authMiddleware");

router.use(protect, allowRoles("owner"));

router.post("/", createStaff);
router.get("/", getStaff);
router.patch("/:id", updateStaff);

module.exports = router;
