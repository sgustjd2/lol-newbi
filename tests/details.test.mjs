import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  parseFormula,
  extractCC,
  labelForCalcKey,
} from "../scripts/skill-details.mjs";
import { enrich } from "../scripts/enrich.mjs";
test("AP 계수와 레벨별 기본값을 구분", () => {
  assert.deepEqual(
    parseFormula(
      {
        __type: "GameCalculation",
        mFormulaParts: [
          { __type: "NamedDataValueCalculationPart", mDataValue: "Damage" },
          { __type: "StatByCoefficientCalculationPart", mCoefficient: 0.75 },
        ],
      },
      { DataValues: [{ name: "Damage", values: [0, 80, 120, 160, 200, 240] }] },
      5,
    ),
    [
      { stat: null, values: [80, 120, 160, 200, 240] },
      { stat: "AP", values: [0.75] },
    ],
  );
});
test("복잡한 곱셈과 미확인 능력치를 억지로 계산하지 않음", () => {
  assert.equal(
    parseFormula(
      { __type: "GameCalculation", mMultiplier: {}, mFormulaParts: [] },
      {},
      5,
    ),
    null,
  );
  assert.equal(
    parseFormula(
      {
        __type: "GameCalculation",
        mFormulaParts: [
          {
            __type: "StatByCoefficientCalculationPart",
            mStat: 12,
            mCoefficient: 0.2,
          },
        ],
      },
      {},
      5,
    ),
    null,
  );
});
test("본인 둔화 해제는 상대에게 거는 CC 아님", () => {
  assert.deepEqual(
    extractCC(
      {
        original: "자신의 둔화 효과를 제거합니다. 다음 공격은 침묵시킵니다.",
        key: "Q",
      },
      { id: "Garen" },
    ).map((e) => e.name),
    ["침묵"],
  );
});
test("계산식 키에 'Health'가 있어도 'Heal'로 오인하지 않음 (TotalHealthDamage → 피해)", () => {
  assert.equal(labelForCalcKey("TotalHealthDamage"), "피해");
  assert.equal(labelForCalcKey("SelfHeal"), "회복");
  assert.equal(labelForCalcKey("ShieldAmount"), "보호막");
});
test("'밀어냅니다'처럼 활용된 형태도 밀어내기 CC로 인식", () => {
  assert.deepEqual(
    extractCC(
      { original: "적에게 박치기를 하여 피해를 입히고 적을 밀어냅니다.", key: "W" },
      { id: "Alistar" },
    ).map((e) => e.name),
    ["밀어내기"],
  );
});
test("'매혹'이라는 단어 없이 '홀리다'로만 써도 매혹 CC로 인식", () => {
  assert.deepEqual(
    extractCC(
      { original: "맞은 적을 홀립니다. 홀린 적은 아리 쪽으로 다가갑니다.", key: "E" },
      { id: "Ahri" },
    ).map((e) => e.name),
    ["매혹"],
  );
});
test("애니 기절에는 방화광 조건을 명시", () => {
  const cc = extractCC(
    { original: "불덩이를 던집니다.", key: "Q" },
    { id: "Annie" },
  );
  assert.match(cc[0].condition, /준비/);
});
test("이름에 형태·조건이 둘인 스킬은 formVariant로 표시", async () => {
  const catalog = JSON.parse(await readFile("data/catalog.json", "utf8"));
  const details = JSON.parse(await readFile("data/skill-details.json", "utf8"));
  const champions = catalog.entries.filter((e) => e.kind === "champion");
  let dualNamed = 0;
  for (const c of champions) {
    for (const s of c.skills) {
      const expected = s.name.includes(" / ");
      if (expected) dualNamed++;
      const d = details.champions[c.id]?.find((x) => x.key === s.key);
      assert.equal(
        d?.formVariant,
        expected,
        `${c.id} ${s.key} (${s.name})의 formVariant 불일치`,
      );
    }
  }
  assert.ok(dualNamed > 0, "이름에 ' / '가 있는 스킬이 하나도 없음");
});
test("챔피언의 복수 전투 역할 유지", () => {
  assert.deepEqual(
    enrich({ kind: "champion", tags: ["Fighter", "Tank"], skills: [] }).roles,
    ["전사", "탱커"],
  );
});
