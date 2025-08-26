import type { Knex } from "knex";

const config: { [key: string]: Knex.Config } = {
  development: {
    client: "pg",
    connection: {
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "5432"),
      user: process.env.DB_USER || "redz",
      password: process.env.DB_PASSWORD || "redz",
      database: process.env.DB_DATABASE || "redz_db",
    },
    migrations: {
      directory: "./migrations",
      extension: "ts",
    },
  },
  test: {
    client: "pg",
    connection: {
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "5432"),
      user: process.env.DB_USER || "redz",
      password: process.env.DB_PASSWORD || "redz",
      database: process.env.DB_DATABASE || "redz_db_test",
    },
    migrations: {
      directory: "./migrations",
      extension: "ts",
    },
  },
  production: {
    client: "pg",
    connection: {
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "5432"),
      user: process.env.DB_USER || "redz",
      password: process.env.DB_PASSWORD || "redz",
      database: process.env.DB_DATABASE || "redz_db",
    },
    migrations: {
      directory: "./migrations",
      extension: "ts",
    },
  },
};

export default config;
