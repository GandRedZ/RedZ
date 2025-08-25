import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("workspace_members", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table
      .uuid("workspace_id")
      .notNullable()
      .references("id")
      .inTable("workspaces")
      .onDelete("CASCADE");
    table
      .enu("role", ["owner", "admin", "editor", "viewer"])
      .defaultTo("viewer");
    table.timestamp("joined_at").defaultTo(knex.fn.now());
    table.timestamp("left_at").nullable();
    table.timestamps(true, true);

    // Indexes
    table.index(["user_id"]);
    table.index(["workspace_id"]);
    table.index(["role"]);
    table.unique(["user_id", "workspace_id"]); // User can only be a member once per workspace
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists("workspace_members");
}
