import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("organization_members", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table
      .uuid("org_id")
      .notNullable()
      .references("id")
      .inTable("organizations")
      .onDelete("CASCADE");
    table
      .enu("role", ["owner", "admin", "member", "viewer"])
      .defaultTo("member");
    table.timestamp("joined_at").defaultTo(knex.fn.now());
    table.timestamp("left_at").nullable();
    table.timestamps(true, true);

    // Indexes
    table.index(["user_id"]);
    table.index(["org_id"]);
    table.index(["role"]);
    table.unique(["user_id", "org_id"]); // User can only be a member once per organization
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists("organization_members");
}
