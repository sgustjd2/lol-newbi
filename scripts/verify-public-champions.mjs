import { mkdir, readFile, rename, writeFile } from "node:fs/promises";

const readJson = async (file) => JSON.parse(await readFile(file, "utf8"));
const catalog = await readJson("data/catalog.json");
const notes = await readJson("data/explanations.json");
const skillNotes = await readJson("data/skill-explanations.json");
const skillDetails = await readJson("data/skill-details.json");
const patch = catalog.patch;
const checkOnly = process.argv.includes("--check");
const skipNetwork = process.argv.includes("--skip-network");

const slugOverrides = {
  AurelionSol: "aurelionsol",
  Belveth: "belveth",
  Chogath: "chogath",
  DrMundo: "drmundo",
  Fiddlesticks: "fiddlesticks",
  JarvanIV: "jarvaniv",
  KhaZix: "khazix",
  KogMaw: "kogmaw",
  KSante: "ksante",
  LeeSin: "leesin",
  MasterYi: "masteryi",
  MissFortune: "missfortune",
  MonkeyKing: "monkeyking",
  RekSai: "reksai",
  TahmKench: "tahmkench",
  TwistedFate: "twistedfate",
  Velkoz: "velkoz",
  XinZhao: "xinzhao",
};

const officialUrl = (id) =>
  `https://www.leagueoflegends.com/ko-kr/champions/${slugOverrides[id] ?? id.toLowerCase()}/`;
const limits = { summary: 60, analogy: 120, tip: 120, caution: 120 };
const champions = catalog.entries.filter((entry) => entry.kind === "champion");
if (champions.length !== 173)
  throw Error(`챔피언 수가 173개가 아님: ${champions.length}`);

const noteByKey = new Map(notes.map((note) => [`${note.kind}/${note.id}`, note]));
const results = await Promise.all(
  champions.map(async (champion) => {
    const url = officialUrl(champion.id);
    const skillText = skillNotes.champions?.[champion.id];
    const detailText = skillDetails.champions?.[champion.id];
    const note = noteByKey.get(`champion/${champion.id}`);
    const errors = [];
    if (!note) errors.push("카드 설명 없음");
    for (const [field, max] of Object.entries(limits)) {
      if (typeof note?.[field] !== "string" || !note[field].trim())
        errors.push(`${field} 없음`);
      else if (note[field].length > max) errors.push(`${field} 길이 초과`);
      else if (/<[^>]*>/.test(note[field])) errors.push(`${field} HTML 포함`);
    }
    if (skillNotes.patch !== patch) errors.push("스킬 설명 패치 불일치");
    if (skillDetails.patch !== patch) errors.push("상세 수치 패치 불일치");
    if (!Array.isArray(skillText) || skillText.length !== 4)
      errors.push("Q/W/E/R 설명 누락");
    if (!Array.isArray(detailText) || detailText.length !== 4)
      errors.push("Q/W/E/R 상세 데이터 누락");
    if (
      Array.isArray(detailText) &&
      Array.isArray(skillText) &&
      detailText.some((detail, index) => detail.formVariant && !skillText[index]?.trim())
    )
      errors.push("변형 스킬 쉬운 설명 누락");

    let status = "skipped";
    if (!skipNetwork) {
      try {
        const response = await fetch(url, { redirect: "follow" });
        status = response.status;
        if (response.status !== 200) errors.push(`공식 페이지 HTTP ${response.status}`);
      } catch (error) {
        errors.push(`공식 페이지 연결 실패: ${error.message}`);
      }
    }
    return {
      id: champion.id,
      name: champion.name,
      url,
      status,
      existingSourceType: note?.sourceType ?? null,
      existingReviewed: note?.reviewed === true,
      errors,
    };
  }),
);

const failures = results.filter((result) => result.errors.length);
if (failures.length) {
  console.error(JSON.stringify({ failures }, null, 2));
  throw Error(`공개 자료 검증 실패: ${failures.length}개`);
}

const verifiedAt = new Date().toISOString();
let publicUpdated = 0;
if (!checkOnly) {
  for (const champion of champions) {
    const key = `champion/${champion.id}`;
    const current = noteByKey.get(key);
    if (current?.sourceType === "notebooklm" && current.reviewed === true) continue;
    noteByKey.set(key, {
      ...current,
      id: champion.id,
      kind: "champion",
      sourceType: "public",
      sourceTitle: `Riot Games 공식 챔피언 페이지 · ${champion.name}`,
      explanationSourceUrl: officialUrl(champion.id),
      patch,
      reviewed: true,
    });
    publicUpdated++;
  }
  await writeFile(
    "data/explanations.tmp",
    JSON.stringify([...noteByKey.values()], null, 2),
  );
  await rename("data/explanations.tmp", "data/explanations.json");
}

await mkdir("private", { recursive: true });
await writeFile(
  "private/public-champion-verification.json",
  JSON.stringify(
    {
      patch,
      verifiedAt,
      sourcePolicy:
        "챔피언 배경·기본 스킬은 Riot Games 공개 페이지, 정확한 수치·조건은 프로젝트 패치 고정 Data Dragon/CommunityDragon 데이터와 대조",
      counts: {
        champions: champions.length,
        publicSource: results.filter((result) => result.existingSourceType !== "notebooklm").length,
        notebooklmSource: results.filter((result) => result.existingSourceType === "notebooklm").length,
        variantSkills: Object.values(skillDetails.champions)
          .flat()
          .filter((skill) => skill.formVariant).length,
        publicUpdated,
      },
      champions: results,
    },
    null,
    2,
  ),
);

console.log(
  `${checkOnly ? "공개 자료 검증 완료" : `공개 자료 검증·반영 완료: ${publicUpdated}개 갱신`} · 챔피언 ${champions.length}개 · 변형 스킬 ${Object.values(skillDetails.champions).flat().filter((skill) => skill.formVariant).length}개`,
);
