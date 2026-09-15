import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("5개 마스터리와 공식 특성 62개가 카테고리별로 정리됨", async () => {
  const runes = JSON.parse(await readFile("data/runes.json", "utf8"));
  assert.equal(runes.paths.length, 5);
  assert.match(runes.sourceUrl, /^https:\/\//);
  const all = runes.paths.flatMap((path) =>
    path.slots.flatMap((slot) => slot.runes),
  );
  assert.equal(all.length, 62);
  assert.equal(new Set(all.map((rune) => rune.id)).size, all.length);
  for (const path of runes.paths) {
    assert.ok(path.name && path.subtitle && path.easy, `${path.key} 설명 없음`);
    assert.equal(path.slots.length, 4, `${path.key} 줄 수`);
    for (const slot of path.slots)
      for (const rune of slot.runes) {
        assert.ok(rune.name && rune.summary && rune.detail, `${path.key} 특성 설명 없음`);
        assert.doesNotMatch(rune.summary, /<[^>]+>/);
        assert.doesNotMatch(rune.detail, /<[^>]+>/);
      }
  }
});

test("특성 탭이 검색·마스터리 필터·상세 경로를 제공함", async () => {
  const app = await readFile("app.js", "utf8");
  const index = await readFile("index.html", "utf8");
  const style = await readFile("style.css", "utf8");
  assert.match(index, /data-kind="runes"/);
  assert.match(app, /data\/runes\.json/);
  assert.match(app, /function renderRunes/);
  assert.match(app, /const runeEasySummaries/);
  assert.match(app, /function equalizeRuneCards/);
  assert.match(app, /rune\/\$\{path\.key\}\/\$\{rune\.key\}/);
  assert.match(style, /\.rune-path/);
  assert.match(style, /\.rune-card/);
  assert.match(style, /--rune-card-height/);
});
