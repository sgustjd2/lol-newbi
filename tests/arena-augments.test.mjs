import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("173개 챔피언에 증바람 대표 증강 카드 3개가 연결됨", async () => {
  const catalog = JSON.parse(await readFile("data/catalog.json", "utf8"));
  const arena = JSON.parse(await readFile("data/arena-augments.json", "utf8"));
  const champions = catalog.entries.filter((entry) => entry.kind === "champion");

  assert.equal(arena.mode, "증바람");
  assert.match(arena.sourceUrl, /^https:\/\//);
  assert.equal(Object.keys(arena.champions).length, champions.length);
  for (const champion of champions) {
    const recommendation = arena.champions[champion.id];
    assert.ok(recommendation, `${champion.id} 증강 추천 없음`);
    assert.equal(recommendation.recommendations.length, 3, `${champion.id} 추천 카드 수`);
    assert.equal(
      new Set(recommendation.recommendations.map((card) => card.name)).size,
      3,
      `${champion.id} 중복 추천 카드`,
    );
    for (const card of recommendation.recommendations) {
      assert.ok(card.category, `${champion.id} 추천 카드 분류 없음`);
      assert.ok(card.reason?.length >= 20, `${champion.id} ${card.name} 설명이 너무 짧음`);
    }
  }
});

test("증바람 추천 UI가 상세 팝업과 줄바꿈 스타일을 제공함", async () => {
  const app = await readFile("app.js", "utf8");
  const style = await readFile("style.css", "utf8");
  assert.match(app, /증바람.*추천 증강 카드/);
  assert.match(app, /arena-augment-reason/);
  assert.match(style, /\.champion-counter-detail/);
  assert.match(style, /\.arena-augment-list/);
  assert.match(style, /word-break:\s*keep-all/);
});
