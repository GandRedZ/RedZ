import knex, { Knex } from "knex";
import knexConfig from "../../knexfile";
import { config } from "../config";

let db: Knex | null = null;

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
    console.log("PostgreSQL connected successfully");
  } catch (error) {
    console.error("Database setup failed:", error);
    throw error;
  }
}

export function getDb(): Knex {
  if (!db) {
    throw new Error("Database not initialized. Call setupDatabase() first.");
  }
  return db;
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.destroy();
    console.log("PostgreSQL connection closed");
  }
}
