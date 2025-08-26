import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("analytics_events", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.string("event_type", 50).notNullable();
    table.uuid("document_id");
    table.uuid("user_id");
    table.jsonb("metadata").defaultTo("{}");
    table.timestamp("timestamp").defaultTo(knex.fn.now());

    // Índices
    table.index(["event_type"], "idx_analytics_events_type");
    table.index(["timestamp"], "idx_analytics_events_timestamp");
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists("analytics_events");
}
