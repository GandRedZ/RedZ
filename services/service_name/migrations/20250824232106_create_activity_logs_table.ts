import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("activity_logs", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table
      .enu("action", [
        "login",
        "logout",
        "create",
        "update",
        "delete",
        "view",
        "download",
        "upload",
        "invite",
        "join",
        "leave",
      ])
      .notNullable();
    table.text("description");
    table.timestamp("timestamp").defaultTo(knex.fn.now());
    table.timestamps(true, true);

    // Indexes
    table.index(["user_id"]);
    table.index(["action"]);
    table.index(["timestamp"]);
    table.index(["user_id", "timestamp"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists("activity_logs");
}
