import express from "express";
import { getPaymentHistory, updatePaymentHistory, getBulkPaymentHistory } from "../controllers/paymentController.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/bulk", protect, adminOnly, getBulkPaymentHistory); // Must be before /:vehicleId
router.get("/:vehicleId", protect, adminOnly, getPaymentHistory);
router.post("/:vehicleId", protect, adminOnly, updatePaymentHistory);

export default router;
