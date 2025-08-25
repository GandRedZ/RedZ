import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("document_permissions", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table
      .uuid("document_id")
      .notNullable()
      .references("id")
      .inTable("documents")
      .onDelete("CASCADE");
    table.boolean("can_read").defaultTo(true);
    table.boolean("can_write").defaultTo(false);
    table.boolean("can_share").defaultTo(false);
    table.boolean("can_comment").defaultTo(false);
    table.timestamps(true, true);

    // Indexes
    table.index(["user_id"]);
    table.index(["document_id"]);
    table.unique(["user_id", "document_id"]); // One permission record per user per document
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists("document_permissions");
}
