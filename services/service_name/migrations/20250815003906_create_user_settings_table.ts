import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("user_settings", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table.enu("theme", ["light", "dark", "auto"]).defaultTo("light");
    table.enu("privacy", ["public", "private", "friends"]).defaultTo("public");
    table.enu("language", ["en", "es", "fr", "de", "pt", "it"]).defaultTo("en");
    table.timestamps(true, true);

    // Indexes
    table.index(["user_id"]);
    table.unique(["user_id"]); // One setting record per user
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists("user_settings");
}
