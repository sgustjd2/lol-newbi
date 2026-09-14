import { readFile, rename, writeFile } from "node:fs/promises";

const catalog = JSON.parse(await readFile("data/catalog.json", "utf8"));
if (!catalog.patch) throw Error("data/catalog.json에 패치 버전이 없습니다.");

const url = `https://ddragon.leagueoflegends.com/cdn/${catalog.patch}/data/ko_KR/item.json`;
const response = await fetch(url);
if (!response.ok) throw Error(`${response.status}: ${url}`);
const source = (await response.json()).data || {};

const entries = catalog.entries.map((entry) => {
  if (entry.kind !== "item") return entry;
  const item = source[entry.id];
  return {
    ...entry,
    from: Array.isArray(item?.from) ? item.from : [],
    into: Array.isArray(item?.into) ? item.into : [],
    depth: item?.depth ?? null,
  };
});

await writeFile(
  "data/catalog.tmp",
  JSON.stringify({ ...catalog, entries }, null, 2),
);
await rename("data/catalog.tmp", "data/catalog.json");

const itemCount = entries.filter((entry) => entry.kind === "item").length;
const withRecipes = entries.filter(
  (entry) => entry.kind === "item" && (entry.from?.length || entry.into?.length),
).length;
console.log(`Synced item recipes for ${itemCount} items (${withRecipes} with relations)`);
