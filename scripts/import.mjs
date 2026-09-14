import { readFile, writeFile, rename } from "node:fs/promises";
import { validateNotes } from "./validate.mjs";
const file = process.argv[2];
if (!file) throw Error("사용법: npm run import -- private/notebooklm.json");
const catalog = JSON.parse(await readFile("data/catalog.json", "utf8"));
const imported = validateNotes(
  JSON.parse(await readFile(file, "utf8")),
  catalog,
);
const existing = JSON.parse(await readFile("data/explanations.json", "utf8"));
const merged = new Map(existing.map((n) => [`${n.kind}/${n.id}`, n]));
for (const n of imported) merged.set(`${n.kind}/${n.id}`, n);
await writeFile(
  "data/explanations.tmp",
  JSON.stringify([...merged.values()], null, 2),
);
await rename("data/explanations.tmp", "data/explanations.json");
console.log(
  `검수된 설명 ${imported.length}개 반영. npm run build로 사이트에 적용하세요.`,
);
