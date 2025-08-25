import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable("organizations", (table) => {
    table
      .foreign("wksp_id")
      .references("id")
      .inTable("workspaces")
      .onDelete("SET NULL");
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.alterTable("organizations", (table) => {
    table.dropForeign(["wksp_id"]);
  });
}
