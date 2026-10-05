// Restaura o banco a partir do snapshot versionado no git (rodar no novo PC)
import fs from "fs";

if (!fs.existsSync("backup/database.db")) {
  console.error("backup/database.db não encontrado. Faça git pull primeiro.");
  process.exit(1);
}

if (!fs.existsSync("data")) fs.mkdirSync("data", { recursive: true });
fs.copyFileSync("backup/database.db", "data/local.db");

const size = fs.statSync("data/local.db").size;
console.log(`Banco restaurado: data/local.db (${(size / 1024).toFixed(1)} KB)`);
console.log("Agora rode: npm run dev (ou npm run build && npm run start)");
