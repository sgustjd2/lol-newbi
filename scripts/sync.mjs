import { mkdir, writeFile, rename } from "node:fs/promises";
const get = async (url) => {
  const r = await fetch(url);
  if (!r.ok) throw Error(`${r.status}: ${url}`);
  return r.json();
};
const patch = (
  await get("https://ddragon.leagueoflegends.com/api/versions.json")
)[0];
const base = `https://ddragon.leagueoflegends.com/cdn/${patch}`;
const [champions, items] = await Promise.all([
  get(`${base}/data/ko_KR/champion.json`),
  get(`${base}/data/ko_KR/item.json`),
]);
const clean = (s) =>
  s
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/[ \t]+/g, " ")
    .trim();
const entries = [
  ...Object.values(champions.data).map((c) => ({
    id: c.id,
    kind: "champion",
    name: c.name,
    subtitle: c.title,
    tags: c.tags,
    original: clean(c.blurb),
    image: `${base}/img/champion/${c.image.full}`,
    sourceUrl: `${base}/data/ko_KR/champion/${c.id}.json`,
  })),
  ...Object.entries(items.data)
    .filter(
      ([, i]) =>
        i.maps?.["11"] &&
        i.gold.purchasable &&
        i.inStore !== false &&
        !i.requiredAlly &&
        !i.requiredChampion,
    )
    .map(([id, i]) => ({
      id,
      kind: "item",
      name: i.name,
      subtitle: clean(i.plaintext || ""),
      tags: i.tags,
      stats: i.stats,
      original: clean(i.description),
      gold: i.gold.total,
      image: `${base}/img/item/${i.image.full}`,
      sourceUrl: `${base}/data/ko_KR/item.json`,
    })),
];
const championEntries = entries.filter((e) => e.kind === "champion");
let next = 0;
await Promise.all(
  Array.from({ length: 6 }, async () => {
    while (next < championEntries.length) {
      const entry = championEntries[next++];
      const champion = (await get(entry.sourceUrl)).data[entry.id];
      entry.skills = champion.spells.map((s, index) => ({
        key: ["Q", "W", "E", "R"][index],
        spellId: s.id,
        tooltip: s.tooltip,
        maxrank: s.maxrank,
        name: s.name,
        image: `${base}/img/spell/${s.image.full}`,
        original: clean(s.description),
      }));
      entry.passive = {
        name: champion.passive.name,
        image: `${base}/img/passive/${champion.passive.image.full}`,
        original: clean(champion.passive.description),
      };
    }
  }),
);
await mkdir("data", { recursive: true });
await writeFile(
  "data/catalog.tmp",
  JSON.stringify(
    { patch, syncedAt: new Date().toISOString(), entries },
    null,
    2,
  ),
);
await rename("data/catalog.tmp", "data/catalog.json");
console.log(`Synced ${patch}: ${entries.length} entries`);
