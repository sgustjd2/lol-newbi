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
