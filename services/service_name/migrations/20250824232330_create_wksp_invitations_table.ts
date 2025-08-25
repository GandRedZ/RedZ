import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("wksp_invitations", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("wksp_id")
      .notNullable()
      .references("id")
      .inTable("workspaces")
      .onDelete("CASCADE");
    table
      .uuid("user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table.string("email", 255).notNullable();
    table.timestamp("issued_by").defaultTo(knex.fn.now());
    table.timestamp("expires_at").notNullable();
    table.enu("role", ["admin", "editor", "viewer"]).defaultTo("viewer");
    table
      .enu("status", ["pending", "accepted", "rejected", "expired"])
      .defaultTo("pending");
    table.timestamp("timestamp").defaultTo(knex.fn.now());
    table.text("message");
    table.timestamps(true, true);

    // Indexes
    table.index(["wksp_id"]);
    table.index(["user_id"]);
    table.index(["email"]);
    table.index(["status"]);
    table.index(["expires_at"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists("wksp_invitations");
}
