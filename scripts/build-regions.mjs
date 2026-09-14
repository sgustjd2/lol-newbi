import { readFile, writeFile, rename } from "node:fs/promises";

// 룬테라 지역별 챔피언 소속 — 공식 발매 로어(챔피언 배경 이야기, 공식 세계관 사이트) 기준으로
// 수동 정리한 매핑. namu.wiki 자동 수집이 레이트리밋으로 막혀 있어 편집자가 직접 구성함.
// 여러 지역에 걸친 챔피언(예: 자운 출신이지만 필트오버에서 활동)은 배열에 두 지역을 모두 표기.
const REGION_MAP = {
  데마시아: [
    "Garen", "Lux", "JarvanIV", "XinZhao", "Fiora", "Quinn", "Galio", "Vayne",
    "Poppy", "Sylas", "Lucian", "Kayle", "Morgana", "Sona", "Shyvana", "Taric",
    "Senna",
  ],
  녹서스: [
    "Swain", "Darius", "Draven", "Katarina", "Talon", "Cassiopeia", "Leblanc",
    "Riven", "Sion", "Vladimir", "Samira", "Rell", "Briar", "Ambessa", "Mel",
    "Kled", "Mordekaiser",
  ],
  아이오니아: [
    "Yasuo", "Yone", "Irelia", "Karma", "Zed", "Shen", "Akali", "Kennen",
    "Lillia", "MasterYi", "MonkeyKing", "Xayah", "Rakan", "Sett", "Jhin",
    "Ahri", "Syndra", "Hwei", "Varus", "LeeSin",
  ],
  프렐요드: [
    "Ashe", "Sejuani", "Lissandra", "Braum", "Tryndamere", "Volibear",
    "Anivia", "Nunu", "Gnar", "Udyr", "Olaf", "Trundle", "Ornn", "Aurora",
    "Brand", "Gragas",
  ],
  필트오버: [
    "Jayce", "Caitlyn", "Heimerdinger", "Ezreal", "Camille", "Orianna", "Vi",
  ],
  자운: [
    "Viktor", "Singed", "Twitch", "Urgot", "Zac", "Ekko", "Jinx", "Warwick",
    "DrMundo", "Renata", "Seraphine", "Vi", "Zeri", "Blitzcrank", "Janna",
  ],
  슈리마: [
    "Azir", "Nasus", "Renekton", "Sivir", "Xerath", "Taliyah", "Akshan",
    "Amumu", "KSante", "Naafiri", "Kassadin", "Nidalee", "Rammus", "Smolder",
  ],
  타곤: [
    "AurelionSol", "Diana", "Leona", "Pantheon", "Taric", "Zoe", "Soraka",
    "Aphelios",
  ],
  빌지워터: [
    "Gangplank", "MissFortune", "Graves", "TwistedFate", "Illaoi", "Nautilus",
    "Pyke", "TahmKench", "Fizz",
  ],
  이쉬탈: [
    "Qiyana", "Neeko", "Milio", "Skarner", "Rengar", "Zyra",
  ],
  "그림자 군도": [
    "Thresh", "Hecarim", "Kalista", "Maokai", "Karthus", "Viego", "Gwen",
    "Vex", "Yorick", "Mordekaiser",
  ],
  "밴들 시티": [
    "Teemo", "Tristana", "Rumble", "Corki", "Ziggs", "Lulu", "Yuumi",
    "Veigar", "Poppy",
  ],
  공허: [
    "Kaisa", "KogMaw", "Chogath", "Malzahar", "Belveth", "Velkoz", "RekSai",
    "Khazix",
  ],
  룬테라: [
    "Ryze", "Bard", "Zilean", "Kindred", "Aatrox", "Kayn", "Evelynn",
    "Nocturne", "Shaco", "Nami", "Alistar", "Annie", "Ivern", "Elise",
    "Malphite", "Nilah", "Fiddlesticks", "Jax",
  ],
};

const catalog = JSON.parse(await readFile("data/catalog.json", "utf8"));
const champIds = new Set(
  catalog.entries.filter((e) => e.kind === "champion").map((e) => e.id),
);

const champions = {};
for (const [region, ids] of Object.entries(REGION_MAP)) {
  for (const id of ids) {
    if (!champIds.has(id)) {
      console.log(`경고: ${id} 는 catalog.json에 없는 챔피언 ID (지역: ${region})`);
      continue;
    }
    champions[id] ??= [];
    champions[id].push(region);
  }
}

const assigned = Object.keys(champions).length;
const total = champIds.size;
const missing = [...champIds].filter((id) => !champions[id]);
console.log(`지역 배정: ${assigned}/${total}`);
if (missing.length) console.log("미배정:", missing.join(", "));

await writeFile(
  "data/regions.tmp",
  JSON.stringify(
    {
      patch: catalog.patch,
      syncedAt: new Date().toISOString(),
      source: "editorial",
      champions,
    },
    null,
    2,
  ),
);
await rename("data/regions.tmp", "data/regions.json");
