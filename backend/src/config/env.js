import dotenv from "dotenv";

// Load environment variables from .env
dotenv.config();

/**
 * Validates critical environment configuration at startup.
 * Fails fast with secret-free, descriptive errors if required values are missing or invalid.
 */
export const validateEnv = () => {
  const nodeEnv = process.env.NODE_ENV || "development";
  const errors = [];

  // 1. Port validation
  const port = process.env.PORT || 3000;
  const parsedPort = Number(port);
  if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
    errors.push(`Invalid PORT: must be an integer between 1 and 65535. Received: '${port}'`);
  }

  // 2. JWT Secret validation
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || typeof jwtSecret !== "string" || !jwtSecret.trim()) {
    errors.push("Missing required environment variable: JWT_SECRET");
  } else if (nodeEnv === "production" && jwtSecret.trim().length < 32) {
    errors.push("In production, JWT_SECRET must be at least 32 characters long for security compliance.");
  }

  // 3. Database URI validation
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri && nodeEnv === "production") {
    errors.push("Missing required environment variable in production: MONGODB_URI");
  } else if (mongoUri && !mongoUri.startsWith("mongodb://") && !mongoUri.startsWith("mongodb+srv://")) {
    errors.push("Invalid MONGODB_URI format: must start with 'mongodb://' or 'mongodb+srv://'");
  }

  // 4. Client URL validation
  const clientUrl = process.env.CLIENT_URL;
  if (!clientUrl && nodeEnv === "production") {
    errors.push("Missing required environment variable in production: CLIENT_URL");
  }

  if (errors.length > 0) {
    console.error("\n=======================================================");
    console.error("FATAL: Environment configuration validation failed:");
    errors.forEach((err) => console.error(`  - ${err}`));
    console.error("=======================================================\n");
    throw new Error(`Environment validation failed with ${errors.length} error(s).`);
  }

  return {
    NODE_ENV: nodeEnv,
    PORT: parsedPort,
    MONGODB_URI: mongoUri || "mongodb://127.0.0.1:27017/user-profile",
    JWT_SECRET: jwtSecret,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "24h",
    CLIENT_URL: clientUrl || "http://localhost:5173",
    TRUST_PROXY: process.env.TRUST_PROXY === "true" || process.env.TRUST_PROXY === "1"
  };
};

export default validateEnv;
