import knex, { Knex } from "knex";
import Redis from "ioredis";
import knexConfig from "../../knexfile";
import { config } from "../config";

let db: Knex | null = null;
let redis: Redis | null = null;

export async function setupDatabase(): Promise<void> {
  try {
    // Setup Knex
    const environment = config.nodeEnv as keyof typeof knexConfig;
    const dbConfig = knexConfig[environment];

    if (!dbConfig) {
      throw new Error(
        `Database configuration not found for environment: ${environment}`
      );
    }

    db = knex(dbConfig);

    // Test connection
    await db.raw("SELECT 1");
    console.log("✅ PostgreSQL connected successfully");

    // Setup Redis
    redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    redis.on("connect", () => {
      console.log("✅ Redis connected successfully");
    });

    redis.on("error", (err) => {
      console.error("❌ Redis connection error:", err);
    });

    // Store redis client in config for rate limiting
    config.redis.client = redis;
  } catch (error) {
    console.error("❌ Database setup failed:", error);
    throw error;
  }
}

export function getDb(): Knex {
  if (!db) {
    throw new Error("Database not initialized. Call setupDatabase() first.");
  }
  return db;
}

export function getRedis(): Redis {
  if (!redis) {
    throw new Error("Redis not initialized. Call setupDatabase() first.");
  }
  return redis;
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.destroy();
    console.log("PostgreSQL connection closed");
  }
  if (redis) {
    redis.disconnect();
    console.log("Redis connection closed");
  }
}
