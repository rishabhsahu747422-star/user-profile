import mongoose from "mongoose";

export const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/user-profile";

  try {
    const conn = await mongoose.connect(mongoURI);
    console.log(`MongoDB connected successfully: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    throw error;
  }
};
