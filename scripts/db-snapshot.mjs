// Snapshot limpo do banco (VACUUM INTO) para versionar no git — one-off e reutilizável
import { createClient } from "@libsql/client";
import fs from "fs";

const url = process.env.DATABASE_URL?.replace(/^"|"$/g, "") ?? "file:./data/local.db";
const client = createClient({ url });

if (!fs.existsSync("backup")) fs.mkdirSync("backup", { recursive: true });

// VACUUM INTO gera uma cópia consistente (sem WAL/locks) do banco inteiro
await client.execute(`VACUUM INTO 'backup/database.db'`);

const size = fs.statSync("backup/database.db").size;
console.log(`Snapshot criado: backup/database.db (${(size / 1024).toFixed(1)} KB)`);
