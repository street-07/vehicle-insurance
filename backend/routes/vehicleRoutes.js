import express from "express";
import {
  getVehicles,
  getVehicleByNumber,
  addVehicle,
  searchVehicles,
  filterVehicles,
  updateVerification,
  fetchAttestrData,
  updateVehicle,
  deleteVehicle,
  deleteBulkVehicles,
  addBulkVehicles,
  resetVerification,
  refreshVehicleApi,
  bulkRefreshVehiclesApi
} from "../controllers/vehicleController.js";

const router = express.Router();
import { protect, adminOnly } from "../middleware/authMiddleware.js";

router.post("/fetch-rc", protect, fetchAttestrData);
router.post("/bulk", protect, adminOnly, addBulkVehicles);
router.post("/delete-bulk", protect, deleteBulkVehicles);
router.post("/bulk-refresh-api", protect, bulkRefreshVehiclesApi);
router.post("/:id/refresh-api", protect, refreshVehicleApi);

router.get("/", protect, getVehicles);
router.get("/search", protect, searchVehicles);
router.get("/filter", protect, filterVehicles);
router.get("/:number", protect, getVehicleByNumber);

router.post("/", protect, addVehicle);
router.put("/:id", protect, updateVehicle);
router.delete("/:id", protect, deleteVehicle);
router.patch("/:id/verify", protect, updateVerification);
router.patch("/:id/reset", protect, resetVerification);

export default router;
