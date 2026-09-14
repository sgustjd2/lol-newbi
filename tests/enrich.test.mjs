import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyItem, simplify } from "../scripts/enrich.mjs";
import { readFile } from "node:fs/promises";
test("공격·마법 혼합 아이템은 복수 역할로 분류", () => {
  assert.deepEqual(
    classifyItem({ tags: ["Damage", "SpellDamage"], stats: {}, original: "" })
      .roles,
    ["AD", "AP"],
  );
});
test("마나 재생만으로 서포터로 분류하지 않음", () => {
  assert.deepEqual(
    classifyItem({ tags: ["ManaRegen"], stats: {}, original: "" }).roles,
    ["공용"],
  );
});
test("방어 아이템과 아군 보호 아이템 구분", () => {
  assert.deepEqual(classifyItem({ tags: ["Armor"], original: "" }).roles, [
    "탱커",
  ]);
  assert.deepEqual(
    classifyItem({ tags: [], original: "아군에게 보호막을 부여합니다." }).roles,
    ["서포터"],
  );
});
test("공식 설명의 대상과 조건을 유지", () => {
  assert.equal(
    simplify("적 챔피언에게 적중하면 체력을 회복합니다."),
    "적 챔피언에게 적중하면 체력을 회복해요.",
  );
});
test("전체 챔피언 QWER 누락 없음", async () => {
  const d = JSON.parse(await readFile("data/catalog.json", "utf8"));
  for (const c of d.entries.filter((e) => e.kind === "champion")) {
    assert.deepEqual(
      c.skills.map((s) => s.key),
      ["Q", "W", "E", "R"],
      c.id,
    );
    assert.ok(
      c.skills.every((s) => s.name && s.original),
      c.id,
    );
  }
});
