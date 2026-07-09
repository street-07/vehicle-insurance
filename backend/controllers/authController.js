import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sysPerf, isAllowedAdmin } from "../middleware/authMiddleware.js";

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || "default_jwt_secret_123", {
    expiresIn: "30d",
  });
};

export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: "Please enter all fields." });

    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: "User already exists." });

    // Force master or allowed admin emails to be admins. Everyone else is a client.
    const assignedRole = isAllowedAdmin(email) ? "admin" : "client";
    const assignedApproval = assignedRole === "admin" ? true : false; // Admins auto-approve, clients wait.

    const user = await User.create({ name, email, password, role: assignedRole, isApproved: assignedApproval });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select("+password");

    if (user && user.isDeleted) {
      return res.status(403).json({ message: "This account has been terminated." });
    }

    if (user && !user.isApproved) {
      return res.status(403).json({ message: "Your account is currently waiting for Administrator approval." });
    }

    if (user && (await bcrypt.compare(password, user.password))) {
      // Restrict admin logins to authorized admin emails only
      if (user.role === "admin" && !isAllowedAdmin(user.email)) {
        return res.status(401).json({ message: "Not authorized as an admin." });
      }

      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        dailyApiLimit: user.dailyApiLimit,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: "Invalid email or password." });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
