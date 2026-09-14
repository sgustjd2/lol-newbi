import { readFile, writeFile, rename } from "node:fs/promises";

const file = process.argv[2];
if (!file)
  throw Error("사용법: node scripts/merge-simplify.mjs <workflow-result.json>");
const result = JSON.parse(await readFile(file, "utf8"));
const catalog = JSON.parse(await readFile("data/catalog.json", "utf8"));

const LIMITS = { summary: 60, analogy: 120, tip: 120, caution: 120 };
const rejected = [];

function validText(kind, id, field, v) {
  const max = LIMITS[field];
  if (typeof v !== "string" || !v.trim() || v.length > max || /<[^>]*>/.test(v)) {
    rejected.push({ kind, id, reason: `${field} 검증 실패 (len=${v?.length})` });
    return false;
  }
  return true;
}

const explanations = JSON.parse(await readFile("data/explanations.json", "utf8"));
const byKey = new Map(explanations.map((n) => [`${n.kind}/${n.id}`, n]));

let cardsUpdated = 0;
for (const entry of (result.champions || []).concat(result.items || [])) {
  const kind = catalog.entries.find((e) => e.id === entry.id)?.kind;
  if (!kind) continue;
  const card = entry.card !== undefined ? entry.card : entry; // items have fields at top level
  if (!card) continue;
  const existing = byKey.get(`${kind}/${entry.id}`);
  if (!existing) continue;
  const fields = ["summary", "analogy", "tip", "caution"];
  if (!fields.every((f) => validText(kind, entry.id, f, card[f]))) continue;
  for (const f of fields) existing[f] = card[f].trim();
  cardsUpdated++;
}

await writeFile(
  "data/explanations.tmp",
  JSON.stringify([...byKey.values()], null, 2),
);
await rename("data/explanations.tmp", "data/explanations.json");

const skillNotes = JSON.parse(
  await readFile("data/skill-explanations.json", "utf8"),
);
let skillsUpdated = 0;
for (const entry of result.champions || []) {
  if (!Array.isArray(entry.skills) || entry.skills.length !== 4) {
    if (entry.skills) {
      rejected.push({
        kind: "champion-skills",
        id: entry.id,
        reason: `skills 배열 길이 이상 (${entry.skills?.length})`,
      });
    }
    continue;
  }
  if (entry.skills.some((s) => typeof s !== "string" || !s.trim() || s.length > 120)) {
    rejected.push({ kind: "champion-skills", id: entry.id, reason: "빈 스킬 또는 120자 초과" });
    continue;
  }
  skillNotes.champions[entry.id] = entry.skills.map((s) => s.trim());
  skillsUpdated++;
}
await writeFile(
  "data/skill-explanations.tmp",
  JSON.stringify(skillNotes, null, 2),
);
await rename("data/skill-explanations.tmp", "data/skill-explanations.json");

console.log(`카드 ${cardsUpdated}개, 스킬 설명 ${skillsUpdated}명 단순화 반영.`);
if (rejected.length) {
  console.log(`거부된 항목 ${rejected.length}개:`);
  for (const r of rejected) console.log(`  - ${r.kind}/${r.id}: ${r.reason}`);
}
