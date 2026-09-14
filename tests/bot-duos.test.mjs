import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("봇 듀오 추천 데이터가 카탈로그 챔피언과 연결됨", async () => {
  const catalog = JSON.parse(await readFile("data/catalog.json", "utf8"));
  const duos = JSON.parse(await readFile("data/bot-duos.json", "utf8"));
  const championIds = new Set(
    catalog.entries
      .filter((entry) => entry.kind === "champion")
      .map((entry) => entry.id),
  );
  assert.equal(duos.patch, "16.18");
  assert.ok(duos.duos.length >= 6);
  for (const duo of duos.duos) {
    assert.ok(championIds.has(duo.adc), `${duo.adc} 챔피언 ID 확인`);
    assert.ok(championIds.has(duo.support), `${duo.support} 챔피언 ID 확인`);
    assert.ok(duo.summary && duo.why?.length && duo.plan);
    assert.ok(duo.counters?.length >= 2);
    for (const counter of duo.counters) {
      assert.ok(championIds.has(counter.adc), `${counter.adc} 카운터 ID 확인`);
      assert.ok(championIds.has(counter.support), `${counter.support} 카운터 ID 확인`);
      assert.ok(counter.reason);
    }
  }
});
