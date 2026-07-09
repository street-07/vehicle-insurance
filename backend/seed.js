import mongoose from "mongoose";
import dotenv from "dotenv";
import Vehicle from "./models/Vehicle.js";
import connectDB from "./config/db.js";

dotenv.config();

connectDB();

const sampleVehicles = [
  {
    vehicleNumber: "MH01AB1234",
    fullName: "John Doe",
    vehicleClass: "Car",
    mobileNumber: "9876543210",
    pucExpiry: new Date("2025-12-31"),
    permitExpiry: new Date("2026-06-30"),
    fitnessExpiry: new Date("2027-01-15"),
    taxExpiry: new Date("2026-03-31"),
    nationalPermitExpiry: new Date("2027-05-20"),
    insuranceExpiry: new Date("2025-11-10"),
  },
  {
    vehicleNumber: "DL04CD5678",
    fullName: "Jane Smith",
    vehicleClass: "Bike",
    mobileNumber: "9123456780",
    pucExpiry: new Date("2026-01-20"),
    permitExpiry: new Date("2026-08-15"),
    fitnessExpiry: new Date("2028-02-10"),
    taxExpiry: new Date("2026-04-30"),
    nationalPermitExpiry: new Date("2028-06-25"),
    insuranceExpiry: new Date("2026-10-05"),
  }
];

const seedData = async () => {
  try {
    await Vehicle.deleteMany();
    await Vehicle.insertMany(sampleVehicles);
    console.log("Data seeded!");
    process.exit();
  } catch (error) {
    console.error("Error seeding data", error);
    process.exit(1);
  }
};

seedData();
