import dotenv from "dotenv";
dotenv.config();

import app from "./src/app.js";
import { connectDB } from "./src/config/db.js";

if (!process.env.JWT_SECRET) {
  console.error("FATAL: JWT_SECRET environment variable is missing.");
  process.exit(1);
}

const port = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await connectDB();
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  } catch (error) {
    console.error("Failed to start server due to database connection error:", error.message);
    process.exit(1);
  }
};

startServer();
