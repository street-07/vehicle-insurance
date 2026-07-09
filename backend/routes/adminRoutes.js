import express from "express";
import { getClients, getClientDetails, clearClientHistory, getPoolCount, distributeVehicles, deleteClient, getArchivedClients, autoAssignBacklog, getDeletionRequests, resolveDeletionRequest, undoClientAction, redoClientAction, transferVehicles, getRecycleBin, restoreVehicle, permanentDeleteLogs, bulkRestoreVehicles, createClient, getNetworkTopology, provisionNode, getTokens, refillTokens } from "../controllers/adminController.js";
import { protect, adminOnly, diagnosticsOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect, adminOnly);

router.get("/tokens", getTokens);
router.post("/tokens/refill", refillTokens);
router.get("/topology", diagnosticsOnly, getNetworkTopology);
router.post("/nodes", diagnosticsOnly, provisionNode);
router.post("/clients", createClient);
router.get("/clients", getClients);
router.get("/clients/archived", getArchivedClients);
router.get("/pool", getPoolCount);
router.post("/distribute", distributeVehicles);
router.post("/transfer", transferVehicles);
router.post("/backlog/auto-assign", autoAssignBacklog);
router.get("/clients/:id", getClientDetails);
router.delete("/clients/:id/history", clearClientHistory);
router.delete("/clients/:id", deleteClient);

router.get("/deletions", getDeletionRequests);
router.post("/deletions/:id/resolve", resolveDeletionRequest);
router.post("/undo-log/:logId", undoClientAction);
router.post("/redo-log/:logId", redoClientAction);

router.get("/recycle-bin", getRecycleBin);
router.post("/recycle-bin/:logId/restore", restoreVehicle);
router.post("/recycle-bin/bulk-restore", bulkRestoreVehicles);
router.post("/recycle-bin/permanent-delete", permanentDeleteLogs);

export default router;
