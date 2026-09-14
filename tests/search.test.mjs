import { test } from "node:test";
import assert from "node:assert/strict";
import { initial, byName } from "../search.js";
import { readFile } from "node:fs/promises";
test("초성과 쌍자음을 기본 자음으로 조회", () => {
  for (const [name, key] of [
    ["가렌", "ㄱ"],
    ["나미", "ㄴ"],
    ["럭스", "ㄹ"],
    ["뽀삐", "ㅂ"],
    ["쓰레쉬", "ㅅ"],
    ["짜", "ㅈ"],
  ])
    assert.equal(initial(name), key);
  assert.equal(initial("Ashe"), "");
});
test("설명 유무와 무관한 가나다순", () => {
  assert.deepEqual(
    [{ name: "럭스", summary: "있음" }, { name: "갈리오" }, { name: "가렌" }]
      .sort(byName)
      .map((e) => e.name),
    ["가렌", "갈리오", "럭스"],
  );
});
test("모든 스킬과 패시브의 공식 이미지 주소 존재", async () => {
  const d = JSON.parse(await readFile("data/catalog.json", "utf8"));
  for (const c of d.entries.filter((e) => e.kind === "champion"))
    for (const s of [...c.skills, c.passive])
      assert.match(
        s.image,
        /^https:\/\/ddragon\.leagueoflegends\.com\/cdn\/[^/]+\/img\/(spell|passive)\/[^/]+\.png$/,
      );
});
test("스킬 소모값 종류에 풀리지 않은 템플릿({{ }})이 없음", async () => {
  const d = JSON.parse(await readFile("data/catalog.json", "utf8"));
  for (const c of d.entries.filter((e) => e.kind === "champion"))
    for (const s of c.skills)
      if (s.costType) assert.doesNotMatch(s.costType, /\{\{/, `${c.id} ${s.key}`);
});
