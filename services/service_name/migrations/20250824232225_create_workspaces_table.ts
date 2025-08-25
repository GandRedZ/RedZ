import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("workspaces", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("RESTRICT");
    table
      .uuid("org_id")
      .notNullable()
      .references("id")
      .inTable("organizations")
      .onDelete("CASCADE");
    table.string("name", 255).notNullable();
    table.timestamps(true, true);

    // Indexes
    table.index(["user_id"]);
    table.index(["org_id"]);
    table.index(["name"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists("workspaces");
}
