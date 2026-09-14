import { readFile, writeFile, rename } from "node:fs/promises";

const file = process.argv[2];
if (!file)
  throw Error("사용법: node scripts/merge-editorial.mjs <workflow-result.json>");
const result = JSON.parse(await readFile(file, "utf8"));
const catalog = JSON.parse(await readFile("data/catalog.json", "utf8"));
const patch = catalog.patch;

const LIMITS = { summary: 60, analogy: 120, tip: 120, caution: 120 };
const rejected = [];

function validCard(kind, entry) {
  if (!entry || typeof entry.id !== "string") return false;
  const known = catalog.entries.some((e) => e.id === entry.id && e.kind === kind);
  if (!known) {
    rejected.push({ kind, id: entry.id, reason: "catalog에 없는 ID" });
    return false;
  }
  for (const [field, max] of Object.entries(LIMITS)) {
    const v = entry[field];
    if (typeof v !== "string" || !v.trim() || v.length > max || /<[^>]*>/.test(v)) {
      rejected.push({ kind, id: entry.id, reason: `${field} 검증 실패 (len=${v?.length})` });
      return false;
    }
  }
  return true;
}

const explanations = JSON.parse(await readFile("data/explanations.json", "utf8"));
const byKey = new Map(explanations.map((n) => [`${n.kind}/${n.id}`, n]));

let championCards = 0;
let itemCards = 0;
for (const entry of result.champions || []) {
  if (!validCard("champion", entry)) continue;
  byKey.set(`champion/${entry.id}`, {
    id: entry.id,
    kind: "champion",
    summary: entry.summary.trim(),
    analogy: entry.analogy.trim(),
    tip: entry.tip.trim(),
    caution: entry.caution.trim(),
    sourceType: "editorial",
    patch,
    reviewed: false,
  });
  championCards++;
}
for (const entry of result.items || []) {
  if (!validCard("item", entry)) continue;
  byKey.set(`item/${entry.id}`, {
    id: entry.id,
    kind: "item",
    summary: entry.summary.trim(),
    analogy: entry.analogy.trim(),
    tip: entry.tip.trim(),
    caution: entry.caution.trim(),
    sourceType: "editorial",
    patch,
    reviewed: false,
  });
  itemCards++;
}

await writeFile(
  "data/explanations.tmp",
  JSON.stringify([...byKey.values()], null, 2),
);
await rename("data/explanations.tmp", "data/explanations.json");

const skillNotes = JSON.parse(
  await readFile("data/skill-explanations.json", "utf8"),
);
let skillsAdded = 0;
for (const entry of result.champions || []) {
  if (!Array.isArray(entry.skills) || !entry.skills.length) continue;
  if (entry.skills.length !== 4) {
    rejected.push({
      kind: "champion-skills",
      id: entry.id,
      reason: `skills 배열 길이 이상 (${entry.skills?.length})`,
    });
    continue;
  }
  if (entry.skills.some((s) => typeof s !== "string" || !s.trim())) {
    rejected.push({ kind: "champion-skills", id: entry.id, reason: "빈 스킬 설명 포함" });
    continue;
  }
  skillNotes.champions[entry.id] = entry.skills.map((s) => s.trim());
  skillsAdded++;
}
skillNotes.patch = patch;
await writeFile(
  "data/skill-explanations.tmp",
  JSON.stringify(skillNotes, null, 2),
);
await rename("data/skill-explanations.tmp", "data/skill-explanations.json");

console.log(
  `카드: 챔피언 ${championCards}개, 아이템 ${itemCards}개 반영. 스킬 설명: ${skillsAdded}명 반영.`,
);
if (rejected.length) {
  console.log(`거부된 항목 ${rejected.length}개:`);
  for (const r of rejected) console.log(`  - ${r.kind}/${r.id}: ${r.reason}`);
}
