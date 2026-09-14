import { readFile, writeFile, rename } from "node:fs/promises";

const file = process.argv[2];
if (!file) throw Error("사용법: node scripts/merge-builds.mjs <workflow-result.json>");
const result = JSON.parse(await readFile(file, "utf8"));
const catalog = JSON.parse(await readFile("data/catalog.json", "utf8"));
const patch = catalog.patch;

const items = catalog.entries.filter((e) => e.kind === "item");
const byName = new Map();
for (const it of items) {
  if (!byName.has(it.name)) byName.set(it.name, it.id);
}

const unresolved = new Set();
function toIds(names) {
  if (!Array.isArray(names)) return [];
  const ids = [];
  for (const n of names) {
    const id = byName.get(n);
    if (id) ids.push(id);
    else unresolved.add(n);
  }
  return ids;
}

const champions = {};
let count = 0;
for (const entry of result.entries || []) {
  const known = catalog.entries.some((e) => e.id === entry.id && e.kind === "champion");
  if (!known) continue;
  const modes = {};
  for (const mode of ["rift", "aram"]) {
    const m = entry[mode];
    if (!m) continue;
    const start = toIds(m.start);
    const boots = toIds(m.boots);
    const core = toIds(m.core);
    const situational = toIds(m.situational);
    if (start.length || boots.length || core.length || situational.length) {
      modes[mode] = { start, boots, core, situational };
    }
  }
  if (Object.keys(modes).length) {
    champions[entry.id] = modes;
    count++;
  }
}

await writeFile(
  "data/builds.tmp",
  JSON.stringify({ patch, generatedAt: new Date().toISOString(), champions }, null, 2),
);
await rename("data/builds.tmp", "data/builds.json");

console.log(`빌드 반영: 챔피언 ${count}명.`);
if (unresolved.size) {
  console.log(`매칭 실패한 아이템 이름 ${unresolved.size}개(무시됨):`);
  console.log([...unresolved].join(", "));
}
