import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("모든 챔피언에 대표 카운터 3개와 쉬운 이유가 있다", async () => {
  const catalog = JSON.parse(await readFile("data/catalog.json", "utf8"));
  const counters = JSON.parse(
    await readFile("data/champion-counters.json", "utf8"),
  );
  const champions = catalog.entries.filter((entry) => entry.kind === "champion");
  const ids = new Set(champions.map((entry) => entry.id));

  assert.equal(counters.patch, "16.18");
  assert.equal(Object.keys(counters.champions).length, champions.length);
  for (const champion of champions) {
    const data = counters.champions[champion.id];
    assert.ok(data, `${champion.id} 카운터 데이터 없음`);
    assert.equal(data.counters.length, 3, `${champion.id} 카운터 수`);
    assert.match(data.sourceUrl, /^https:\/\/lolalytics\.com\/lol\/[^/]+\/counters\/$/);
    const seen = new Set();
    for (const counter of data.counters) {
      assert.ok(ids.has(counter.id), `${champion.id}의 알 수 없는 카운터 ${counter.id}`);
      assert.notEqual(counter.id, champion.id, `${champion.id} 자기 자신이 카운터로 들어감`);
      assert.ok(!seen.has(counter.id), `${champion.id} 중복 카운터 ${counter.id}`);
      assert.ok(counter.reason?.length >= 15, `${champion.id} ${counter.id} 이유가 너무 짧음`);
      seen.add(counter.id);
    }
  }
});

test("카운터 이유가 반복 문구 대신 챔피언 고유 스킬을 설명한다", async () => {
  const counters = JSON.parse(
    await readFile("data/champion-counters.json", "utf8"),
  );
  const reasons = Object.values(counters.champions).flatMap((entry) =>
    entry.counters.map((counter) => counter.reason),
  );
  assert.equal(counters.reasonVersion, "champion-mechanics-v2");
  assert.ok(
    reasons.every(
      (reason) =>
        !reason.includes("멀리서 계속 때려") &&
        !reason.includes("속박·기절 같은 방해 기술"),
    ),
  );
  const garenReasons = counters.champions.Garen.counters.map(
    (counter) => counter.reason,
  );
  assert.match(garenReasons.find((reason) => reason.startsWith("케일")), /사거리가 길어지고.*무적/);
  assert.match(garenReasons.find((reason) => reason.startsWith("트위스티드 페이트")), /골드 카드.*다른 라인/);
  assert.notEqual(
    garenReasons.find((reason) => reason.startsWith("케일")),
    garenReasons.find((reason) => reason.startsWith("트위스티드 페이트")),
  );
});
