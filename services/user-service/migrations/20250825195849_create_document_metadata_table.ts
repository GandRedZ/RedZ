import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("document_metadata", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("document_id")
      .notNullable()
      .references("id")
      .inTable("documents")
      .onDelete("CASCADE");
    table.integer("word_count");
    table.integer("reading_time");
    table.string("language", 10);
    table.decimal("sentiment_score", 4, 3);
    table.jsonb("topics").defaultTo("[]");
    table.jsonb("keywords").defaultTo("[]");
    table.string("extraction_status", 20).defaultTo("pending");
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());

    // Índices
    table.index(["document_id"], "idx_document_metadata_document_id");
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists("document_metadata");
}
