
const express = require("express");
const router = express.Router();

const {
  submitKyc,
  getKycRecords,
  reviewKyc,
  viewDocument
} = require("../controllers/kycController");

const {
  protect,
  allowRoles
} = require("../middlewares/authMiddleware");

router.use(protect);

router.post(
  "/",
  allowRoles("owner", "general_manager", "kyc_compliance"),
  submitKyc
);

router.get(
  "/",
  allowRoles("owner", "general_manager", "kyc_compliance"),
  getKycRecords
);

router.get(
  "/:id/document",
  allowRoles("owner", "general_manager", "kyc_compliance"),
  viewDocument
);

router.patch(
  "/:id/review",
  allowRoles("owner", "general_manager", "kyc_compliance"),
  reviewKyc,
  viewDocument
);

module.exports = router;
