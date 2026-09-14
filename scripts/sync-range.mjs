import { readFile, writeFile, rename } from "node:fs/promises";
const catalog = JSON.parse(await readFile("data/catalog.json", "utf8"));
const version = catalog.patch;
const base = `https://ddragon.leagueoflegends.com/cdn/${version}`;
const champions = catalog.entries.filter((e) => e.kind === "champion");
let next = 0;
let failed = 0;
await Promise.all(
  Array.from({ length: 6 }, async () => {
    while (next < champions.length) {
      const c = champions[next++];
      try {
        const r = await fetch(`${base}/data/ko_KR/champion/${c.id}.json`, {
          signal: AbortSignal.timeout(30000),
        });
        if (!r.ok) throw Error(r.status);
        const champion = (await r.json()).data[c.id];
        c.skills.forEach((s, i) => {
          const spell = champion.spells[i];
          s.rangeBurn = spell.rangeBurn;
          s.cooldownBurn = spell.cooldownBurn;
          s.costBurn = spell.costBurn;
          s.costType = /\{\{/.test(spell.costType)
            ? champion.partype
            : spell.costType;
        });
      } catch {
        failed++;
      }
    }
  }),
);
await writeFile("data/catalog.tmp", JSON.stringify(catalog, null, 2));
await rename("data/catalog.tmp", "data/catalog.json");
console.log(
  `사거리·재사용 대기시간 추가: 챔피언 ${champions.length - failed}/${champions.length} (실패 ${failed})`,
);
