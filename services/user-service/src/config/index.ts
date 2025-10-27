import * as dotenv from "dotenv";

dotenv.config();

export const config = {
  // Server
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number.parseInt(process.env.PORT || "3001"),
  host: process.env.HOST || "0.0.0.0",

  // Database
  database: {
    host: process.env.DB_HOST || "localhost",
    port: Number.parseInt(process.env.DB_PORT || "5432"),
    user: process.env.DB_USER || "redz",
    password: process.env.DB_PASSWORD || "redz",
    name: process.env.DB_NAME || "user_service_dev",
    ssl: process.env.DB_SSL === "true",
  },

  // Redis
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: Number.parseInt(process.env.REDIS_PORT || "6379"),
    password: process.env.REDIS_PASSWORD || undefined,
    db: Number.parseInt(process.env.REDIS_DB || "0"),
    client: null as any, // Will be set in database setup
  },

  // JWT
  jwtSecret: process.env.JWT_SECRET || "your-super-secret-jwt-key",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "15m",
  jwtRefreshSecret:
    process.env.JWT_REFRESH_SECRET || "your-super-secret-refresh-key",
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",

  // Security
  bcryptRounds: Number.parseInt(process.env.BCRYPT_ROUNDS || "10"),
  maxLoginAttempts: Number.parseInt(process.env.MAX_LOGIN_ATTEMPTS || "5"),
  lockTime: process.env.LOCK_TIME || "15m",

  // CORS
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3000",

  // Rate Limiting
  rateLimitWindow: process.env.RATE_LIMIT_WINDOW || "15m",
  rateLimitMax: Number.parseInt(process.env.RATE_LIMIT_MAX || "100"),

  // Email (for future password reset)
  email: {
    host: process.env.SMTP_HOST || "smtp.mailtrap.io",
    port: Number.parseInt(process.env.SMTP_PORT || "2525"),
    user: process.env.SMTP_USER || "",
    password: process.env.SMTP_PASSWORD || "",
    from: process.env.EMAIL_FROM || "noreply@yourdomain.com",
  },
};
