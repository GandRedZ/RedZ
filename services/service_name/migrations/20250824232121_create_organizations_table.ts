import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("organizations", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.string("name", 255).notNullable();
    table
      .uuid("user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("RESTRICT"); // Owner
    table.integer("members").defaultTo(1);
    table
      .enu("size", ["small", "medium", "large", "enterprise"])
      .defaultTo("small");
    table.uuid("wksp_id"); // Will be referenced after workspaces table is created
    table.timestamps(true, true);

    // Indexes
    table.index(["user_id"]);
    table.index(["name"]);
    table.index(["created_at"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists("organizations");
}
