import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("users", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.string("email", 255).unique().notNullable();
    table.string("password_hash", 255).notNullable();
    table.string("first_name", 100).notNullable();
    table.string("last_name", 100).notNullable();
    table.string("role", 20).defaultTo("user");
    table.boolean("is_active").defaultTo(true);
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());

    // Índices
    table.index(["email"], "idx_users_email");
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists("users");
}
