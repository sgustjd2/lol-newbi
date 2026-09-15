import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  parseFormula,
  extractCC,
  labelForCalcKey,
  isVariantSkill,
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
test("시전자의 도약은 공중에 띄우기 CC로 오인하지 않음", () => {
  assert.deepEqual(
    extractCC(
      { original: "공중으로 도약해 적들에게 물리 피해를 입히고 이동 속도를 감소시킵니다.", key: "Q" },
      { id: "Jayce" },
    ).map((e) => e.name),
    ["둔화"],
  );
  assert.deepEqual(
    extractCC(
      { original: "충격으로 적을 공중에 띄웁니다.", key: "R" },
      { id: "Test" },
    ).map((e) => e.name),
    ["공중에 띄우기"],
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
test("형태·조건·강화 스킬은 formVariant로 표시", async () => {
  const catalog = JSON.parse(await readFile("data/catalog.json", "utf8"));
  const details = JSON.parse(await readFile("data/skill-details.json", "utf8"));
  const champions = catalog.entries.filter((e) => e.kind === "champion");
  let dualNamed = 0;
  for (const c of champions) {
    for (const s of c.skills) {
      const expected = isVariantSkill(c.id, s);
      if (expected) dualNamed++;
      const d = details.champions[c.id]?.find((x) => x.key === s.key);
      assert.equal(
        d?.formVariant,
        expected,
        `${c.id} ${s.key} (${s.name})의 formVariant 불일치`,
      );
    }
  }
  assert.ok(dualNamed > 24, "형태·강화·재사용 변형 스킬이 충분히 표시되지 않음");
});
test("챔피언의 복수 전투 역할 유지", () => {
  assert.deepEqual(
    enrich({ kind: "champion", tags: ["Fighter", "Tank"], skills: [] }).roles,
    ["전사", "탱커"],
  );
});

test("검수 완료 카드의 화면용 출처는 NotebookLM 이름을 노출하지 않음", async () => {
  const app = await readFile("app.js", "utf8");
  assert.match(app, /자료 검수 완료/);
  assert.doesNotMatch(app, /NotebookLM · 검수 완료/);
});

test("173개 챔피언 카드가 검수 완료 상태이고 공개 출처가 연결됨", async () => {
  const catalog = JSON.parse(await readFile("data/catalog.json", "utf8"));
  const notes = JSON.parse(await readFile("data/explanations.json", "utf8"));
  const champions = catalog.entries.filter((entry) => entry.kind === "champion");
  const championNotes = notes.filter((note) => note.kind === "champion");
  assert.equal(champions.length, 173);
  assert.equal(championNotes.length, 173);
  assert.equal(championNotes.filter((note) => note.reviewed === true).length, 173);
  assert.equal(
    championNotes.filter((note) => note.sourceType === "notebooklm").length,
    68,
  );
  assert.equal(
    championNotes.filter((note) => note.sourceType === "public").length,
    105,
  );
  for (const note of championNotes) {
    assert.match(note.explanationSourceUrl, /^https:\/\//, `${note.id} 출처 URL 없음`);
    assert.equal(note.patch, catalog.patch, `${note.id} 패치 불일치`);
  }
});

test("변형·강화 스킬의 쉬운 설명이 특수 조건을 보존", async () => {
  const catalog = JSON.parse(await readFile("data/catalog.json", "utf8"));
  const notes = JSON.parse(await readFile("data/skill-explanations.json", "utf8"));
  const required = {
    "Nidalee/Q": ["인간 형태", "쿠거 형태", "사냥"],
    "Nidalee/W": ["인간 형태", "쿠거 형태", "사냥"],
    "Nidalee/E": ["인간 형태", "쿠거 형태"],
    "Nidalee/R": ["인간 형태", "쿠거 형태", "Q·W·E"],
    "Alistar/E": ["최대", "추가 마법 피해", "기절"],
    "Jayce/Q": ["해머 형태", "캐논 형태", "가속 관문"],
    "Jayce/W": ["해머 형태", "캐논 형태", "3번"],
    "Jayce/E": ["해머 형태", "캐논 형태", "전격 폭발"],
    "Jayce/R": ["해머", "캐논", "방어력", "마법 저항력"],
    "Qiyana/Q": ["얼음", "바위", "수풀", "속박", "투명"],
    "Shyvana/E": ["사람 형태", "용 형태", "불길"],
    "Aphelios/Q": ["주 무기", "만월총", "중력포", "반월검"],
    "Aphelios/R": ["주 무기"],
    "Hwei/Q": ["파멸의 화염", "절단의 번개", "녹아내린 균열"],
    "Hwei/W": ["쏜살같은 물살", "반사의 웅덩이", "요동치는 빛"],
    "Hwei/E": ["암울한 형상", "심연의 응시", "파괴의 아귀"],
    "Kayn/Q": ["다르킨 학살자", "최대 체력"],
    "Kayn/W": ["그림자 암살자", "다르킨 학살자", "공중에 띄워"],
    "Kayn/E": ["그림자 암살자", "둔화에 면역"],
    "Kayn/R": ["그림자 암살자", "다르킨 학살자", "체력을 회복"],
    "Kaisa/Q": ["살아있는 무기", "진화"],
    "Kaisa/W": ["진화", "표식을 더"],
    "Kaisa/E": ["진화", "투명"],
    "KSante/W": ["총공세", "밀거나 기절시키지"],
    "KSante/R": ["총공세", "방어구 관통력", "추가 방어력"],
    "Heimerdinger/R": ["강화 Q", "강화 W", "강화 E"],
    "Smolder/Q": ["25중첩", "125중첩", "225중첩", "6.5%"],
    "Viktor/Q": ["증강", "보호막"],
    "Viktor/W": ["증강", "1초"],
    "Viktor/E": ["증강", "여진"],
    "Viktor/R": ["증강", "25%", "커지며"],
    "Rengar/Q": ["최대 야성", "공격 속도"],
    "Rengar/E": ["최대 야성", "묶어"],
    "Riven/Q": ["세 번째", "공중에 띄워"],
    "Syndra/Q": ["40개", "2개까지"],
    "Syndra/R": ["100개", "15%", "처치"],
    "Vladimir/Q": ["두 번", "강화", "회복량"],
    "Yunara/Q": ["초월"],
    "Yunara/W": ["초월", "빛줄기"],
    "Yunara/E": ["초월", "돌진"],
    "Yunara/R": ["초월", "Q, W, E"],
    "Rell/W": ["탑승 상태", "보행 상태"],
    "Khazix/W": ["진화", "3개", "둔화"],
    "Rumble/E": ["최대 2개", "위험 상태"],
  };
  for (const [key, terms] of Object.entries(required)) {
    const [id, skillKey] = key.split("/");
    const champion = catalog.entries.find((e) => e.id === id);
    const index = champion.skills.findIndex((s) => s.key === skillKey);
    const explanation = notes.champions[id]?.[index] || "";
    for (const term of terms)
      assert.match(explanation, new RegExp(term.replace(/[·]/g, "\\·")), `${key}에 '${term}' 누락`);
  }
});
