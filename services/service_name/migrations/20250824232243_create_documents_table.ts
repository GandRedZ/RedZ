import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("documents", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("workspace_id")
      .notNullable()
      .references("id")
      .inTable("workspaces")
      .onDelete("CASCADE");
    table
      .uuid("user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("RESTRICT");
    table.string("title", 500).notNullable();
    table.timestamps(true, true);

    // Indexes
    table.index(["workspace_id"]);
    table.index(["user_id"]);
    table.index(["title"]);
    table.index(["created_at"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists("documents");
}
