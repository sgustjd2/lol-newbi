import { mkdir, readFile, writeFile } from "node:fs/promises";

const readJson = async (file) => JSON.parse(await readFile(file, "utf8"));

const catalog = await readJson("data/catalog.json");
const notes = await readJson("data/explanations.json");
const skillNotes = await readJson("data/skill-explanations.json");
const patch = catalog.patch;
const entries = catalog.entries;
const noteByKey = new Map(
  notes.map((note) => [`${note.kind}/${note.id}`, note]),
);

const currentNote = (entry) => {
  const note = noteByKey.get(`${entry.kind}/${entry.id}`);
  if (!note || note.patch !== patch) return null;
  if (note.sourceType === "notebooklm" && note.reviewed === true) return note;
  if (note.sourceType === "editorial") return note;
  return null;
};

const champions = entries.filter((entry) => entry.kind === "champion");
const items = entries.filter((entry) => entry.kind === "item");
const missingChampions = champions.filter((entry) => !currentNote(entry));
const missingItems = items.filter((entry) => !currentNote(entry));
const pendingReview = notes.filter(
  (note) =>
    note.patch === patch &&
    note.sourceType === "notebooklm" &&
    note.reviewed !== true,
);

const roleLabels = {
  Fighter: "전사",
  Tank: "탱커",
  Mage: "마법사",
  Assassin: "암살자",
  Marksman: "원거리 딜러",
  Support: "서포터",
};

const missingSkills = [];
for (const champion of champions) {
  const received = skillNotes.champions?.[champion.id];
  const missing = champion.skills
    .map((skill, index) => ({ skill, index }))
    .filter(({ index }) => !Array.isArray(received) || !received[index]?.trim())
    .map(({ skill }) => skill.key);
  if (missing.length) {
    missingSkills.push({
      id: champion.id,
      name: champion.name,
      roles: (champion.roles || champion.tags || []).map(
        (role) => roleLabels[role] || role,
      ),
      missing,
    });
  }
}

const simplify = (entry) => ({
  id: entry.id,
  kind: entry.kind,
  name: entry.name,
  roles: (entry.roles || entry.tags || []).map(
    (role) => roleLabels[role] || role,
  ),
});

const report = {
  patch,
  generatedAt: new Date().toISOString(),
  counts: {
    champions: champions.length,
    items: items.length,
    currentEntityNotes:
      champions.length - missingChampions.length + items.length - missingItems.length,
    missingChampions: missingChampions.length,
    missingItems: missingItems.length,
    pendingNotebookReview: pendingReview.length,
    championsWithMissingSkillNotes: missingSkills.length,
    missingSkillSlots: missingSkills.reduce(
      (sum, champion) => sum + champion.missing.length,
      0,
    ),
  },
  missingChampions: missingChampions.map(simplify),
  missingItems: missingItems.map(simplify),
  pendingNotebookReview: pendingReview.map((note) => ({
    id: note.id,
    kind: note.kind,
    sourceTitle: note.sourceTitle,
  })),
  missingSkills,
};

const table = (title, rows, empty = "없음") => {
  const lines = [`## ${title}`, ""];
  if (!rows.length) return [...lines, empty, ""];
  lines.push("| 번호 | ID | 이름 | 역할 |", "| ---: | --- | --- | --- |");
  rows.forEach((entry, index) => {
    lines.push(
      `| ${index + 1} | ${entry.id} | ${entry.name} | ${entry.roles.join(" · ") || "미분류"} |`,
    );
  });
  lines.push("");
  return lines;
};

const markdown = [
  "# 쉬운 설명 누락 조사 보고서",
  "",
  `생성 패치: **${patch}** · 생성 시각: ${report.generatedAt}`,
  "",
  "이 파일은 `npm run report:missing`으로 다시 만들 수 있습니다. `private/` 아래에만 저장되므로 공개 빌드에는 포함되지 않습니다.",
  "",
  "## 현황",
  "",
  `- 챔피언: ${report.counts.champions}개 중 쉬운 카드 설명 누락 ${report.counts.missingChampions}개`,
  `- 아이템: ${report.counts.items}개 중 쉬운 카드 설명 누락 ${report.counts.missingItems}개`,
  `- NotebookLM 검수 대기 항목: ${report.counts.pendingNotebookReview}개`,
  `- Q/W/E/R 편집 설명이 하나라도 없는 챔피언: ${report.counts.championsWithMissingSkillNotes}개 (${report.counts.missingSkillSlots}슬롯)`,
  "",
  "Claude 세션은 이 보고서와 JSON을 읽고, 아래의 공개 프롬프트에 따라 작은 묶음으로 조사합니다.",
  "",
  ...table("쉬운 설명이 없는 챔피언", report.missingChampions),
  ...table("쉬운 설명이 없는 아이템", report.missingItems),
  "## Q/W/E/R 편집 설명 누락",
  "",
  ...(missingSkills.length
    ? [
        "| ID | 챔피언 | 빠진 스킬 |",
        "| --- | --- | --- |",
        ...missingSkills.map(
          (entry) => `| ${entry.id} | ${entry.name} | ${entry.missing.join(" · ")} |`,
        ),
        "",
      ]
    : ["모든 챔피언에 Q/W/E/R 편집 설명이 있습니다.", ""]),
  "## 다음 실행",
  "",
  "1. `docs/claude-easy-explanations.md`를 읽고 NotebookLM에서 챔피언 8개 또는 아이템 20개씩 수집합니다.",
  "2. 근거 문장과 Riot 공식 페이지를 대조한 항목만 `reviewed: true`로 저장합니다.",
  "3. `npm run import -- private/notebooklm-batch-XX.json` → `npm run build` → `npm test` 순서로 반영합니다.",
  "4. 스킬 설명은 `data/skill-explanations.json`의 챔피언별 Q/W/E/R 배열에 같은 순서로 반영합니다.",
  "",
].join("\n");

await mkdir("private", { recursive: true });
await writeFile(
  "private/missing-easy-explanations.json",
  JSON.stringify(report, null, 2),
);
await writeFile("private/missing-easy-explanations.md", markdown);
console.log(
  `누락 보고서 생성: 챔피언 ${missingChampions.length}개, 아이템 ${missingItems.length}개, 스킬 슬롯 ${report.counts.missingSkillSlots}개`,
);
