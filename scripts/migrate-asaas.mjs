// Migração aditiva: colunas da integração Asaas (one-off, idempotente)
import { createClient } from "@libsql/client";

const url = process.env.DATABASE_URL?.replace(/^"|"$/g, "") ?? "file:./data/local.db";
const client = createClient({ url });

const statements = [
  `ALTER TABLE providers ADD COLUMN asaas_customer_id text`,
  `ALTER TABLE providers ADD COLUMN trial_used integer NOT NULL DEFAULT 0`,
  `CREATE UNIQUE INDEX IF NOT EXISTS providers_asaas_customer_uq ON providers (asaas_customer_id) WHERE asaas_customer_id IS NOT NULL`,
];

for (const sql of statements) {
  try {
    await client.execute(sql);
    console.log("OK  :", sql.slice(0, 90));
  } catch (e) {
    const msg = String(e);
    if (msg.includes("duplicate column") || msg.includes("already exists")) {
      console.log("SKIP:", sql.slice(0, 90), "(já existe)");
    } else {
      console.error("FAIL:", sql.slice(0, 90), "\n     ", msg.split("\n")[0]);
      process.exitCode = 1;
    }
  }
}

const cols = await client.execute("PRAGMA table_info(providers)");
console.log("providers.asaas_customer_id:", cols.rows.some((r) => r.name === "asaas_customer_id"));
console.log("providers.trial_used:", cols.rows.some((r) => r.name === "trial_used"));
