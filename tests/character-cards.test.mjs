import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));

test("캐릭터 카드 화면의 목록 버튼과 필수 섹션이 연결되어 있다", async () => {
  const [html, app, css] = await Promise.all([
    readFile("index.html", "utf8"),
    readFile("app.js", "utf8"),
    readFile("style.css", "utf8"),
  ]);

  assert.match(html, /id="character-card-page"/);
  assert.match(html, /id="character-card-back"/);
  assert.match(html, /id="character-card-print"/);
  assert.match(app, /캐릭터 카드 보기/);
  assert.match(app, /card\/champion/);
  assert.match(app, /character-card-skill/);
  assert.match(app, /character-card-counter/);
  assert.match(app, /character-card-item/);
  assert.match(app, /const characterCardFactionKeys/);
  assert.match(app, /character-card-theme-\$\{characterCardFactionKey\(champion\)\}/);
  assert.match(app, /function fitCharacterCardViewport/);
  assert.match(app, /window\.print\(\)/);
  assert.match(css, /\.character-card/);
  assert.match(css, /character-card-theme-demacia/);
  assert.match(css, /character-card-theme-void/);
  assert.match(css, /--card-fit-scale/);
  assert.match(css, /@media print/);
});

test("173개 챔피언 모두 카드용 스킬·아이템·카운터 자료를 갖고 있다", async () => {
  const [catalog, skillNotes, builds, counters] = await Promise.all([
    readJson("data/catalog.json"),
    readJson("data/skill-explanations.json"),
    readJson("data/builds.json"),
    readJson("data/champion-counters.json"),
  ]);
  const champions = catalog.entries.filter((entry) => entry.kind === "champion");

  assert.equal(champions.length, 173);
  assert.equal(Object.keys(builds.champions).length, 173);
  assert.equal(Object.keys(counters.champions).length, 173);
  for (const champion of champions) {
    assert.equal(champion.skills.length, 4, champion.id);
    assert.equal(skillNotes.champions[champion.id].length, 4, champion.id);
    assert.ok(builds.champions[champion.id]?.rift, champion.id);
    assert.ok(counters.champions[champion.id]?.counters?.length >= 3, champion.id);
  }
});
