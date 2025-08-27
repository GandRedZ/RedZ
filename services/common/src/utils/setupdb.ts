#!/usr/bin/env tsx

import { existsSync } from "fs";
import { resolve } from "path";
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
  cwd?: string; //allows to work from diferent working directory
}

type DatabaseAction =
  | "migrate"
  | "rollback"
  | "drop"
  | "seed"
  | "status"
  | "reset"
  | "setup";

class DatabaseSetup {
  private readonly rootPath: string;

  // work from a specific directory if provided useful to work with nx monorepo
  constructor(cwd?: string) {
    this.rootPath = cwd || process.cwd();
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
      delete require.cache[require.resolve(fullPath)];

      // Load knexfile (support both .js and .ts files)
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
        user: dbConfig.connection.user || "postgres",
        password: dbConfig.connection.password || "postgres",
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
      // Use the PostgreSQL container that's already running
      const containerName = "postgres";

      // Verify that the container is running
      execSync(`docker ps -q -f name=${containerName}`, { stdio: "pipe" });

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
        console.warn(
          "Database existence check failed or database does not exist:",
          error
        );
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
      console.error(`Knex command failed: ${command}`);
      throw error;
    }
  }

  /**
   * Database setup: Create database + Run migrations
   */
  async setup(options: SetupDbOptions): Promise<void> {
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

      console.log(
        `Database setup completed successfully for ${options.environment}`
      );
    } catch (error) {
      console.error(`Database setup failed:`, error);
      throw error;
    }
  }

  /**
   * Run latest migrations
   */
  async migrate(options: SetupDbOptions): Promise<void> {
    try {
      await this.executeKnexCommand(
        options.knexFileLocation,
        options.environment,
        "migrate:latest"
      );
    } catch (error) {
      console.error(`Migration failed:`, error);
      throw error;
    }
  }

  /**
   * Rollback last migration
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
   * Drop all migrations (rollback all)
   */
  async drop(options: SetupDbOptions): Promise<void> {
    try {
      await this.executeKnexCommand(
        options.knexFileLocation,
        options.environment,
        "migrate:rollback --all"
      );
    } catch (error) {
      console.error(`Drop migrations failed:`, error);
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

  /**
   * Reset: Drop all + Migrate + Seed
   */
  async reset(options: SetupDbOptions): Promise<void> {
    try {
      // Drop all migrations
      try {
        await this.drop(options);
      } catch (error) {
        console.warn(
          "Drop migrations failed or database might be empty:",
          error
        );
      }

      // Run migrations
      await this.migrate(options);

      // Run seeds (only in development by default)
      if (options.environment === "development") {
        await this.seed(options);
      }
    } catch (error) {
      console.error(`Database reset failed:`, error);
      throw error;
    }
  }

  /**
   * Execute any database action
   */
  async execute(
    action: DatabaseAction,
    options: SetupDbOptions
  ): Promise<void> {
    switch (action) {
      case "setup":
        return this.setup(options);
      case "migrate":
        return this.migrate(options);
      case "rollback":
        return this.rollback(options);
      case "drop":
        return this.drop(options);
      case "seed":
        return this.seed(options);
      case "status":
        return this.status(options);
      case "reset":
        return this.reset(options);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }
}

// Parse command line arguments with support for both formats
function parseArguments(): { action: DatabaseAction; options: SetupDbOptions } {
  const args = process.argv.slice(2);

  let knexFileLocation = "";
  let environment = "development";
  let action: DatabaseAction = "setup";
  let cwd = process.cwd();

  // Parse arguments in different formats
  for (const arg of args) {
    if (
      arg.startsWith("--knexFileLocation=") ||
      arg.startsWith("--knexfileLocation=")
    ) {
      knexFileLocation = arg.split("=")[1];
    } else if (arg.startsWith("--environment=")) {
      let envValue = arg.split("=")[1];
      // Clean Nx interpolation if it comes unresolved
      if (
        envValue.includes("{args.environment") ||
        envValue === '"{args.environment}"' ||
        envValue === "'{args.environment}'"
      ) {
        envValue = "development";
      }
      environment = envValue.replace(/['"]/g, "");
    } else if (arg.startsWith("--action=")) {
      action = arg.split("=")[1] as DatabaseAction;
    } else if (arg.startsWith("--cwd=")) {
      cwd = arg.split("=")[1];
    } else if (arg === "--migrate") {
      action = "migrate";
    } else if (arg === "--rollback") {
      action = "rollback";
    } else if (arg === "--drop") {
      action = "drop";
    } else if (arg === "--seed") {
      action = "seed";
    } else if (arg === "--status") {
      action = "status";
    } else if (arg === "--reset") {
      action = "reset";
    }
  }

  // Fallback to environment variables
  if (!knexFileLocation) {
    knexFileLocation =
      process.env.knexFileLocation || process.env.knexfileLocation || "";
  }
  if (!environment || environment === "development") {
    environment = process.env.environment || "development";
  }

  // Validate required arguments
  if (!knexFileLocation) {
    console.error("knexFileLocation is required");
    console.log("Usage examples:");
    console.log(
      "  tsx setupdb.ts --knexFileLocation=./knexfile.ts --environment=development"
    );
    console.log(
      "  tsx setupdb.ts --knexFileLocation=./knexfile.ts --action=migrate"
    );
    console.log("  tsx setupdb.ts --knexFileLocation=./knexfile.ts --migrate");
    process.exit(1);
  }

  return {
    action,
    options: {
      knexFileLocation,
      environment,
      createDatabase: action === "setup",
      verbose:
        process.argv.includes("--verbose") || process.argv.includes("-v"),
      cwd,
    },
  };
}

// Main function compatible with Nx configuration
async function main() {
  try {
    const { action, options } = parseArguments();
    const setup = new DatabaseSetup(options.cwd);

    await setup.execute(action, options);
  } catch (error) {
    console.error("Database operation failed:", error.message);
    process.exit(1);
  }
}

// Function for programmatic use
export async function runDatabaseAction(
  action: DatabaseAction,
  options: SetupDbOptions
): Promise<void> {
  const setup = new DatabaseSetup(options.cwd);
  return setup.execute(action, options);
}

// Legacy function for backward compatibility
export async function runDatabaseSetup(options: SetupDbOptions): Promise<void> {
  return runDatabaseAction("setup", options);
}

// Execute if this is the main file
if (require.main === module) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

export { DatabaseSetup, SetupDbOptions, DatabaseAction };
