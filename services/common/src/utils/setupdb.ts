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
      delete require.cache[require.resolve(fullPath)];

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
      console.log(`✅ Configuration loaded for environment: ${environment}`);

      return {
        client: dbConfig.client,
        host: dbConfig.connection.host || "localhost",
        port: dbConfig.connection.port || 5432,
        user: dbConfig.connection.user || "redz",
        password: dbConfig.connection.password || "redz",
        database: dbConfig.connection.database,
      };
    } catch (error) {
      console.error(`❌ Error loading knexfile:`, error);
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

      // Command to check if the database exists
      const checkDbCommand = `docker exec ${containerName} psql -U ${user} -d postgres -t -c "SELECT 1 FROM pg_database WHERE datname='${config.database}'"`;

      let dbExists = false;
      try {
        const result = execSync(checkDbCommand, {
          stdio: "pipe",
          cwd: this.rootPath,
          encoding: "utf8",
          env: { ...process.env, PGPASSWORD: password },
        });
        dbExists = result.trim() === "1";
      } catch (error) {
        console.log(`📝 Database check failed, assuming it doesn't exist`);
      }

      if (!dbExists) {
        // Create the database using the container
        const createDbCommand = `docker exec ${containerName} psql -U ${user} -d postgres -c "CREATE DATABASE ${config.database};"`;
        console.log(`🔄 Creating database: ${config.database}`);

        execSync(createDbCommand, {
          stdio: "pipe",
          cwd: this.rootPath,
          env: { ...process.env, PGPASSWORD: password },
        });
        console.log(`✅ Database ${config.database} created successfully`);
      } else {
        console.log(`✅ Database ${config.database} already exists`);
      }
    } catch (error) {
      console.warn(
        `⚠️  Could not create database automatically:`,
        error.message
      );
      console.warn(`\n   🛠️  Solutions:`);
      console.warn(`   1. Make sure PostgreSQL container is running:`);
      console.warn(`      docker-compose up -d postgres`);
      console.warn(`   2. Create database manually using Docker:`);
      console.warn(
        `      docker exec postgres psql -U ${config.user} -d postgres -c "CREATE DATABASE ${config.database};"`
      );
      console.warn(`   3. Use a database management tool like pgAdmin`);
      console.warn(
        `\n   ⏭️  Continuing with migration (database must exist)...`
      );
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

    console.log(`\n🔄 Executing: ${knexCommand}`);

    try {
      execSync(knexCommand, {
        stdio: "inherit",
        cwd: this.rootPath,
      });
      console.log(`✅ Command completed successfully`);
    } catch (error) {
      console.error(`❌ Command failed:`, error);
      throw error;
    }
  }

  /**
   * Executes migrations with prior database creation
   */
  async migrate(options: SetupDbOptions): Promise<void> {
    console.log(`\n🚀 Starting database setup and migration...`);
    console.log(`📁 Knexfile: ${options.knexFileLocation}`);
    console.log(`🌍 Environment: ${options.environment}`);

    try {
      // 1. Load configuration
      const config = await this.loadKnexConfig(
        options.knexFileLocation,
        options.environment
      );

      // 2. Create database if it doesn't exist
      if (options.createDatabase !== false) {
        await this.createDatabase(config);
      }

      // 3. Execute migrations
      console.log(`\n📊 Running migrations...`);
      await this.executeKnexCommand(
        options.knexFileLocation,
        options.environment,
        "migrate:latest"
      );

      console.log(`\n✨ Database setup and migration completed successfully!`);
    } catch (error) {
      console.error(`\n❌ Database setup failed:`, error);
      throw error;
    }
  }

  /**
   * Rollback migrations
   */
  async rollback(options: SetupDbOptions): Promise<void> {
    console.log(`\n🔄 Starting rollback...`);

    try {
      await this.executeKnexCommand(
        options.knexFileLocation,
        options.environment,
        "migrate:rollback"
      );
      console.log(`\n✅ Rollback completed successfully!`);
    } catch (error) {
      console.error(`\n❌ Rollback failed:`, error);
      throw error;
    }
  }

  /**
   * Execute seeds
   */
  async seed(options: SetupDbOptions): Promise<void> {
    console.log(`\n🌱 Starting seeding...`);

    try {
      await this.executeKnexCommand(
        options.knexFileLocation,
        options.environment,
        "seed:run"
      );
      console.log(`\n✅ Seeding completed successfully!`);
    } catch (error) {
      console.error(`\n❌ Seeding failed:`, error);
      throw error;
    }
  }

  /**
   * Fresh: Rollback all + Migrate + Seed
   */
  async fresh(options: SetupDbOptions): Promise<void> {
    console.log(`\n🔄 Starting fresh database setup...`);

    try {
      // 1. Rollback all
      try {
        await this.executeKnexCommand(
          options.knexFileLocation,
          options.environment,
          "migrate:rollback --all"
        );
      } catch (error) {
        console.warn(`⚠️  Could not rollback (database might be empty)`);
      }

      // 2. Migrate
      await this.migrate(options);

      // 3. Seed (only in development by default)
      if (options.environment === "development") {
        await this.seed(options);
      }
    } catch (error) {
      console.error(`\n❌ Fresh setup failed:`, error);
      throw error;
    }
  }

  /**
   * Shows migration status
   */
  async status(options: SetupDbOptions): Promise<void> {
    console.log(`\n📊 Checking migration status...`);

    try {
      await this.executeKnexCommand(
        options.knexFileLocation,
        options.environment,
        "migrate:status"
      );
    } catch (error) {
      console.error(`\n❌ Status check failed:`, error);
      throw error;
    }
  }
}

// Main function that works with Nx configuration
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
    console.error("❌ knexFileLocation is required");
    console.log(
      "Usage: tsx setupdb.ts --knexFileLocation=<path> --environment=<env>"
    );
    console.log("Arguments received:", args);
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
    console.log(`\n🎯 Database Setup Utility`);
    console.log(`📁 Knexfile: ${options.knexFileLocation}`);
    console.log(`🌍 Environment: ${options.environment}`);

    // By default execute migrate (which includes database creation)
    await setup.migrate(options);
  } catch (error) {
    console.error("\n❌ Database setup failed:", error.message);
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
