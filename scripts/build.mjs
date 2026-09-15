import { mkdir, copyFile, readFile, writeFile } from "node:fs/promises";
import { enrich } from "./enrich.mjs";
const catalog = JSON.parse(await readFile("data/catalog.json", "utf8"));
const notes = JSON.parse(await readFile("data/explanations.json", "utf8"));
const skillNotes = JSON.parse(
  await readFile("data/skill-explanations.json", "utf8"),
);
const skillDetails = JSON.parse(
  await readFile("data/skill-details.json", "utf8"),
);
const builds = await readFile("data/builds.json", "utf8")
  .then(JSON.parse)
  .catch(() => ({ patch: null, champions: {} }));
const lore = await readFile("data/lore.json", "utf8")
  .then(JSON.parse)
  .catch(() => ({ champions: {} }));
const regions = await readFile("data/regions.json", "utf8")
  .then(JSON.parse)
  .catch(() => ({ champions: {} }));
const arenaAugments = await readFile("data/arena-augments.json", "utf8")
  .then(JSON.parse)
  .catch(() => ({ champions: {} }));
const itemById = new Map(
  catalog.entries.filter((e) => e.kind === "item").map((e) => [e.id, e]),
);
const resolveItems = (ids) =>
  (ids || [])
    .map((id) => itemById.get(id))
    .filter(Boolean)
    .map((it) => ({ id: it.id, name: it.name, image: it.image }));
const allowed = [
  "summary",
  "analogy",
  "tip",
  "caution",
  "sourceType",
  "sourceTitle",
  "explanationSourceUrl",
  "patch",
  "reviewed",
];
const entries = catalog.entries.map((e) => {
  const enhanced = enrich(e);
  if (e.kind === "champion" && skillDetails.patch === catalog.patch) {
    enhanced.skills = enhanced.skills.map((s, i) => ({
      ...s,
      advanced: skillDetails.champions[e.id]?.[i],
    }));
  }
  if (
    e.kind === "champion" &&
    skillNotes.patch === catalog.patch &&
    skillNotes.champions[e.id]
  ) {
    enhanced.skills = enhanced.skills.map((s, i) => ({
      ...s,
      easy: skillNotes.champions[e.id][i],
      edited: true,
    }));
  }
  if (e.kind === "champion" && builds.patch === catalog.patch) {
    const b = builds.champions[e.id];
    if (b) {
      enhanced.builds = Object.fromEntries(
        Object.entries(b).map(([mode, m]) => [
          mode,
          {
            start: resolveItems(m.start),
            boots: resolveItems(m.boots),
            core: resolveItems(m.core),
            situational: resolveItems(m.situational),
          },
        ]),
      );
    }
  }
  if (e.kind === "champion" && arenaAugments.champions[e.id]) {
    enhanced.arena = {
      ...arenaAugments.champions[e.id],
      mode: arenaAugments.mode,
      sourceTitle: arenaAugments.sourceTitle,
      sourceUrl: arenaAugments.sourceUrl,
      notice: arenaAugments.notice,
    };
  }
  if (e.kind === "champion" && lore.champions[e.id]) {
    enhanced.lore = lore.champions[e.id];
  }
  if (e.kind === "champion" && regions.champions[e.id]?.length) {
    enhanced.regions = regions.champions[e.id];
  }
  const n = notes.find(
    (n) =>
      n.id === e.id &&
      n.kind === e.kind &&
      n.patch === catalog.patch &&
      (n.sourceType === "editorial" ||
        (n.sourceType === "public" && n.reviewed === true) ||
        (n.sourceType === "notebooklm" && n.reviewed === true)),
  );
  return {
    ...enhanced,
    ...(n
      ? Object.fromEntries(allowed.filter((k) => k in n).map((k) => [k, n[k]]))
      : {}),
  };
});
await mkdir("dist/data", { recursive: true });
for (const file of [
  "index.html",
  "style.css",
  "app.js",
  "search.js",
  "favicon.svg",
])
  await copyFile(file, `dist/${file}`);
await writeFile(
  "dist/data/catalog.json",
  JSON.stringify({ ...catalog, entries }),
);
await writeFile("dist/.nojekyll", "");
await copyFile("data/glossary.json", "dist/data/glossary.json");
await copyFile("data/runes.json", "dist/data/runes.json");
await copyFile("data/bot-duos.json", "dist/data/bot-duos.json");
await copyFile("data/easter-eggs.json", "dist/data/easter-eggs.json");
await copyFile("data/champion-counters.json", "dist/data/champion-counters.json");
await copyFile(
  "data/region-stories.json",
  "dist/data/region-stories.json",
).catch(() => {});
await copyFile(
  "data/region-timeline.json",
  "dist/data/region-timeline.json",
).catch(() => {});
await copyFile("node_modules/@seed-design/css/base.css", "dist/seed.css");
await copyFile(
  "node_modules/@seed-design/css/LICENSE",
  "dist/SEED-LICENSE.txt",
);
await copyFile("node_modules/@seed-design/css/NOTICE", "dist/SEED-NOTICE.txt");
console.log(`Built ${entries.length} entries`);
