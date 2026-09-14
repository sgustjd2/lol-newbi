import { readFile, writeFile, rename } from "node:fs/promises";

const FILES = {
  데마시아: "scratch-regions/out-데마시아.txt",
  녹서스: "scratch-regions/out-녹서스.txt",
  아이오니아: "scratch-regions/out-아이오니아.txt",
  프렐요드: "scratch-regions/out-프렐요드.txt",
  필트오버: "scratch-regions/out-필트오버.txt",
  자운: "scratch-regions/out-자운.txt",
  슈리마: "scratch-regions/out-슈리마.txt",
  타곤: "scratch-regions/out-타곤.txt",
  빌지워터: "scratch-regions/out-빌지워터.txt",
  이쉬탈: "scratch-regions/out-이쉬탈.txt",
  "그림자 군도": "scratch-regions/out-그림자군도.txt",
  "밴들 시티": "scratch-regions/out-밴들시티.txt",
  공허: "scratch-regions/out-공허.txt",
  룬테라: "scratch-regions/out-룬테라.txt",
};

const regions = {};
for (const [region, path] of Object.entries(FILES)) {
  let raw;
  try {
    raw = await readFile(path, "utf8");
  } catch {
    console.log(`건너뜀 (파일 없음): ${region}`);
    continue;
  }
  const trimmed = raw.trim();
  const nl = trimmed.indexOf("\n");
  const title = trimmed.slice(0, nl).trim();
  const text = trimmed.slice(nl).trim();
  regions[region] = { title, text };
  console.log(`${region}: "${title}" (${text.length}자)`);
}

await writeFile(
  "data/region-stories.tmp",
  JSON.stringify(
    {
      patch: "16.18.1",
      syncedAt: new Date().toISOString(),
      source: "editorial",
      regions,
    },
    null,
    2,
  ),
);
await rename("data/region-stories.tmp", "data/region-stories.json");
console.log(`총 ${Object.keys(regions).length}개 지역 저장 완료`);
