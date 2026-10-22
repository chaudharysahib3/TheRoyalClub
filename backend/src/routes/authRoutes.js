
const express = require("express");
const router = express.Router();

const { login, requestSignupOtp, verifySignupOtp } = require("../controllers/authController");
const {
  protect,
  allowRoles
} = require("../middlewares/authMiddleware");

router.post("/login", login);
router.post("/signup/request-otp", requestSignupOtp);
router.post("/signup/verify-otp", verifySignupOtp);

router.get("/me", protect, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

router.get(
  "/owner-area",
  protect,
  allowRoles("owner"),
  (req, res) => {
    res.json({
      success: true,
      message: "Owner access granted"
    });
  }
);

module.exports = router;
