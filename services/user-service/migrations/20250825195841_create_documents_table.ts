import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("documents", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.string("title", 500).notNullable();
    table.text("description");
    table.string("file_path", 1000).notNullable();
    table.bigInteger("file_size").notNullable();
    table.string("mime_type", 100).notNullable();
    table.string("document_type", 50).notNullable();
    table.uuid("owner_id").notNullable();
    table.string("department", 100);
    table.string("access_level", 20).defaultTo("private");
    table.integer("version").defaultTo(1);
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());

    // Índices
    table.index(["owner_id"], "idx_documents_owner_id");
    table.index(["document_type"], "idx_documents_document_type");
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists("documents");
}
