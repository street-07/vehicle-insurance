import mongoose from "mongoose";

// Disable command buffering so queries fail immediately if disconnected
mongoose.set("bufferCommands", false);

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) return;
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("DB Connection Error:", error.message);
    console.log("Running in MOCK mode without DB");
  }
};

export default connectDB;
