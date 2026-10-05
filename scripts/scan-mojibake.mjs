// Varredura completa de mojibake em todos os .ts/.tsx de src
import fs from "fs";
import path from "path";

const bad = [];
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(e.name)) {
      const s = fs.readFileSync(p, "utf8");
      // padrões de dupla codificação (UTF-8 lido como Latin-1)
      const m = s.match(/Ã.|Ã¢â‚¬|â€\u0093|â€\u0094|â€\u009c|â€\u009d|Â·|â—|â–|âœ|âš /g);
      if (m) bad.push(`${p}: ${m.length} ocorrência(s)`);
    }
  }
}
walk("src");
console.log(bad.length === 0 ? "TUDO LIMPO" : bad.join("\n"));
