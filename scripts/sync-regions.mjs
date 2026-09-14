import { readFile, writeFile, rename } from "node:fs/promises";

const catalog = JSON.parse(await readFile("data/catalog.json", "utf8"));
const lore = JSON.parse(await readFile("data/lore.json", "utf8"));
const existing = await readFile("data/regions.json", "utf8")
  .then(JSON.parse)
  .catch(() => ({ champions: {} }));
const champions = catalog.entries
  .filter((e) => e.kind === "champion")
  .filter((e) => lore.champions[e.id])
  .filter((e) => !existing.champions[e.id]);
console.log(`이미 있음 ${Object.keys(existing.champions).length}개, 새로 수집 ${champions.length}개`);

const REGIONS = [
  "데마시아", "녹서스", "아이오니아", "프렐요드", "필트오버", "자운", "슈리마",
  "타곤", "빌지워터", "이시탈", "그림자 군도", "반도 시티", "공허", "룬테라",
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchPage = async (url) => {
  for (let attempt = 0; attempt < 4; attempt++) {
    const r = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(20000),
    });
    if (r.status === 429) {
      await sleep(3000 * (attempt + 1));
      continue;
    }
    if (!r.ok) return null;
    return r.text();
  }
  return null;
};

const regions = { ...existing.champions };
const failed = [];
let next = 0;
await Promise.all(
  Array.from({ length: 3 }, async () => {
    while (next < champions.length) {
      const c = champions[next++];
      await sleep(300);
      const mainUrl = `https://namu.wiki/w/${encodeURIComponent(c.name)}`;
      try {
        let html = await fetchPage(mainUrl);
        if (!html || !html.includes("주 역할군")) {
          html = await fetchPage(`https://namu.wiki/w/${encodeURIComponent(c.name + "(리그 오브 레전드)")}`);
        }
        if (!html) {
          failed.push(c.id);
          continue;
        }
        const idx = html.indexOf("소속");
        const window = idx >= 0 ? html.slice(idx, idx + 6000) : "";
        const found = REGIONS.filter((r) => window.includes(r));
        regions[c.id] = found;
        if (!found.length) failed.push(c.id);
      } catch {
        failed.push(c.id);
      }
    }
  }),
);

await writeFile(
  "data/regions.tmp",
  JSON.stringify({ patch: catalog.patch, syncedAt: new Date().toISOString(), champions: regions }, null, 2),
);
await rename("data/regions.tmp", "data/regions.json");
const total = catalog.entries.filter((e) => e.kind === "champion").length;
console.log(`지역 수집: ${Object.keys(regions).length}/${total} (이번 실패/미확인 ${failed.length})`);
if (failed.length) console.log("실패:", failed.join(", "));
