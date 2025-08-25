import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("file_attachments", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.string("type", 100).notNullable(); // file type/extension
    table
      .uuid("document_id")
      .notNullable()
      .references("id")
      .inTable("documents")
      .onDelete("CASCADE");
    table.timestamps(true, true);

    // Indexes
    table.index(["document_id"]);
    table.index(["type"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists("file_attachments");
}
