#!/usr/bin/env tsx

import { existsSync } from "fs";
import { resolve, join, dirname } from "path";
import { execSync } from "child_process";

interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  client: string;
}

interface SetupDbOptions {
  knexFileLocation: string;
  environment: string;
  createDatabase?: boolean;
  verbose?: boolean;
}

class DatabaseSetup {
  private rootPath: string;

  constructor() {
    this.rootPath = process.cwd();
  }

  /**
   * Loads and parses the knexfile to get configuration
   */
  private async loadKnexConfig(
    knexFilePath: string,
    environment: string
  ): Promise<DatabaseConfig> {
    const fullPath = resolve(this.rootPath, knexFilePath);

    if (!existsSync(fullPath)) {
      throw new Error(`Knexfile not found at: ${fullPath}`);
    }

    try {
      // Clear require cache to reload the file
      delete require.cache[require.resolve(fullPath)];

      // Load knexfile
      const knexConfig = require(fullPath);
      const config = knexConfig.default || knexConfig;

      if (!config[environment]) {
        throw new Error(
          `Environment '${environment}' not found in knexfile. Available: ${Object.keys(
            config
          ).join(", ")}`
        );
      }

      const dbConfig = config[environment];

      return {
        client: dbConfig.client,
        host: dbConfig.connection.host || "localhost",
        port: dbConfig.connection.port || 5432,
        user: dbConfig.connection.user || "redz",
        password: dbConfig.connection.password || "redz",
        database: dbConfig.connection.database,
      };
    } catch (error) {
      console.error(`Error loading knexfile:`, error);
      throw error;
    }
  }

  /**
   * Creates the database if it doesn't exist (PostgreSQL using Docker container)
   */
  private async createDatabase(config: DatabaseConfig): Promise<void> {
    try {
      const host = config.host;
      const port = config.port;
      const user = config.user;
      const password = config.password;

      // Use the PostgreSQL container that's already running
      const containerName = "postgres"; // Your container name

      // Verify that the container is running
      try {
        execSync(`docker ps -q -f name=${containerName}`, { stdio: "pipe" });
      } catch (error) {
        throw new Error(
          `PostgreSQL container '${containerName}' is not running. Please start it with: docker-compose up -d postgres`
        );
      }

      // Command to check if the database exists
      const checkDbCommand = `docker exec ${containerName} psql -U ${config.user} -d postgres -t -c "SELECT 1 FROM pg_database WHERE datname='${config.database}'"`;

      let dbExists = false;
      try {
        const result = execSync(checkDbCommand, {
          stdio: "pipe",
          cwd: this.rootPath,
          encoding: "utf8",
          env: { ...process.env, PGPASSWORD: config.password },
        });
        dbExists = result.trim() === "1";
      } catch (error) {
        // Database doesn't exist
      }

      if (!dbExists) {
        // Create the database using the container
        const createDbCommand = `docker exec ${containerName} psql -U ${config.user} -d postgres -c "CREATE DATABASE ${config.database};"`;

        execSync(createDbCommand, {
          stdio: "pipe",
          cwd: this.rootPath,
          env: { ...process.env, PGPASSWORD: config.password },
        });
      }
    } catch (error) {
      throw new Error(`Could not create database: ${error.message}`);
    }
  }

  /**
   * Executes a Knex command
   */
  private async executeKnexCommand(
    knexFilePath: string,
    environment: string,
    command: string
  ): Promise<void> {
    const fullKnexPath = resolve(this.rootPath, knexFilePath);
    const knexCommand = `npx knex ${command} --knexfile="${fullKnexPath}" --env="${environment}"`;

    try {
      execSync(knexCommand, {
        stdio: "inherit",
        cwd: this.rootPath,
      });
    } catch (error) {
      console.error(`Command failed:`, error);
      throw error;
    }
  }

  /**
   * Executes migrations with prior database creation
   */
  async migrate(options: SetupDbOptions): Promise<void> {
    try {
      const config = await this.loadKnexConfig(
        options.knexFileLocation,
        options.environment
      );

      if (options.createDatabase !== false) {
        await this.createDatabase(config);
      }

      await this.executeKnexCommand(
        options.knexFileLocation,
        options.environment,
        "migrate:latest"
      );
    } catch (error) {
      console.error(`Database setup failed:`, error);
      throw error;
    }
  }

  /**
   * Rollback migrations
   */
  async rollback(options: SetupDbOptions): Promise<void> {
    try {
      await this.executeKnexCommand(
        options.knexFileLocation,
        options.environment,
        "migrate:rollback"
      );
    } catch (error) {
      console.error(`Rollback failed:`, error);
      throw error;
    }
  }

  /**
   * Execute seeds
   */
  async seed(options: SetupDbOptions): Promise<void> {
    try {
      await this.executeKnexCommand(
        options.knexFileLocation,
        options.environment,
        "seed:run"
      );
    } catch (error) {
      console.error(`Seeding failed:`, error);
      throw error;
    }
  }

  /**
   * Fresh: Rollback all + Migrate + Seed
   */
  async fresh(options: SetupDbOptions): Promise<void> {
    try {
      try {
        await this.executeKnexCommand(
          options.knexFileLocation,
          options.environment,
          "migrate:rollback --all"
        );
      } catch (error) {
        // Database might be empty
      }

      await this.migrate(options);

      if (options.environment === "development") {
        await this.seed(options);
      }
    } catch (error) {
      console.error(`Fresh setup failed:`, error);
      throw error;
    }
  }

  /**
   * Shows migration status
   */
  async status(options: SetupDbOptions): Promise<void> {
    try {
      await this.executeKnexCommand(
        options.knexFileLocation,
        options.environment,
        "migrate:status"
      );
    } catch (error) {
      console.error(`Status check failed:`, error);
      throw error;
    }
  }
}

//  Main function that works with Nx configuration
async function main() {
  // Parse command line arguments
  let knexFileLocation = "";
  let environment = "development";

  const args = process.argv.slice(2);

  // Search for arguments in --key=value format
  for (const arg of args) {
    if (arg.startsWith("--knexFileLocation=")) {
      knexFileLocation = arg.split("=")[1];
    } else if (arg.startsWith("--environment=")) {
      let envValue = arg.split("=")[1];
      // Clean Nx interpolation if it comes unresolved
      if (
        envValue.includes("{args.environment") ||
        envValue === "\"{args.environment || 'development'}\""
      ) {
        envValue = "development";
      }
      environment = envValue.replace(/['"]/g, ""); // Remove quotes
    }
  }

  // Fallback to environment variables if not found in args
  if (!knexFileLocation) {
    knexFileLocation = process.env.knexFileLocation || "";
  }
  if (!environment || environment === "development") {
    environment = process.env.environment || "development";
  }

  // Validate that knexFileLocation was provided
  if (!knexFileLocation) {
    console.error("knexFileLocation is required");
    console.log(
      "Usage: tsx setupdb.ts --knexFileLocation=<path> --environment=<env>"
    );
    process.exit(1);
  }

  const options: SetupDbOptions = {
    knexFileLocation,
    environment,
    createDatabase: true,
    verbose: process.argv.includes("--verbose") || process.argv.includes("-v"),
  };

  const setup = new DatabaseSetup();

  try {
    // By default execute migrate (which includes database creation)
    await setup.migrate(options);
  } catch (error) {
    console.error("Database setup failed:", error.message);
    process.exit(1);
  }
}

// Function for programmatic use
export async function runDatabaseSetup(options: SetupDbOptions) {
  const setup = new DatabaseSetup();
  return setup.migrate(options);
}

// Execute if this is the main file
if (require.main === module) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

export { DatabaseSetup, SetupDbOptions };
