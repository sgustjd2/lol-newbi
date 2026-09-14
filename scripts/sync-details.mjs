import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { parseFormula, extractCC, labelForCalcKey } from "./skill-details.mjs";
const catalog = JSON.parse(await readFile("data/catalog.json", "utf8"));
const version = catalog.patch.split(".").slice(0, 2).join(".");
const champions = catalog.entries.filter((e) => e.kind === "champion");
const result = { patch: catalog.patch, champions: {} };
let next = 0;
await mkdir(`private/calculations-${version}`, { recursive: true });
await Promise.all(
  Array.from({ length: 5 }, async () => {
    while (next < champions.length) {
      const c = champions[next++];
      const url = `https://raw.communitydragon.org/${version}/game/data/characters/${c.id.toLowerCase()}/${c.id.toLowerCase()}.bin.json`;
      let data;
      try {
        try {
          data = JSON.parse(
            await readFile(
              `private/calculations-${version}/${c.id}.json`,
              "utf8",
            ),
          );
        } catch {
          const r = await fetch(url, { signal: AbortSignal.timeout(30000) });
          if (!r.ok) throw Error(r.status);
          data = await r.json();
          await writeFile(
            `private/calculations-${version}/${c.id}.json`,
            JSON.stringify(data),
          );
        }
      } catch {
        data = null;
      }
      const record = Object.values(data || {}).find(
        (v) => v.__type === "CharacterRecord",
      );
      result.champions[c.id] = c.skills.map((skill, i) => {
        const reference = record?.spellNames?.[i];
        const matches = Object.entries(data || {}).filter(
          ([key, v]) =>
            v.mSpell &&
            (key
              .toLowerCase()
              .endsWith("/" + String(reference).toLowerCase()) ||
              key.split("/").at(-1).toLowerCase() ===
                skill.spellId?.toLowerCase()),
        );
        const spell = matches.length === 1 ? matches[0][1].mSpell : null;
        const formulas = [];
        const unresolved = [];
        for (const [key, calc] of Object.entries(
          spell?.mSpellCalculations || {},
        )) {
          if (!skill.tooltip?.toLowerCase().includes(key.toLowerCase()))
            continue;
          const parts = parseFormula(calc, spell, skill.maxrank || 5);
          if (parts) {
            const label = labelForCalcKey(key);
            if (label) formulas.push({ label, parts });
          } else unresolved.push(key);
        }
        return {
          key: skill.key,
          formulas,
          partial: true,
          formVariant: skill.name.includes(" / "),
          cc: extractCC(skill, c),
          sourceUrl: url,
          matched: Boolean(spell),
          unresolvedCount: unresolved.length,
        };
      });
    }
  }),
);
await writeFile("data/skill-details.tmp", JSON.stringify(result, null, 2));
await rename("data/skill-details.tmp", "data/skill-details.json");
const all = Object.values(result.champions).flat();
console.log(
  `Details: ${all.length} skills; formulas ${all.filter((s) => s.formulas.length).length}; CC ${all.filter((s) => s.cc.length).length}`,
);
