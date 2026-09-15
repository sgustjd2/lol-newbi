const round = (n) => Number(n.toFixed(4));
export function labelForCalcKey(key) {
  if (/shield/i.test(key)) return "보호막";
  if (/damage/i.test(key)) return "피해";
  if (/heal/i.test(key)) return "회복";
  return null;
}

// Some skills change without putting both forms in the displayed skill name.
// Keep this list explicit so a patch refresh cannot silently hide an alternate
// form just because Riot renamed the visible spell label.
export const variantSkillKeys = {
  Aphelios: ["Q", "W", "E", "R"],
  AurelionSol: ["R"],
  Ambessa: ["Q"],
  Alistar: ["E"],
  Belveth: ["R"],
  Briar: ["W"],
  Elise: ["Q", "W", "E", "R"],
  Fizz: ["E"],
  Gnar: ["Q", "W", "E", "R"],
  Heimerdinger: ["R"],
  Hwei: ["Q", "W", "E"],
  Jayce: ["Q", "W", "E", "R"],
  Kaisa: ["Q", "W", "E"],
  Karma: ["Q", "W", "E"],
  Kennen: ["E"],
  Kayn: ["Q", "W", "E", "R"],
  Khazix: ["Q", "W", "E", "R"],
  LeeSin: ["Q", "W"],
  KSante: ["Q", "W", "E", "R"],
  Neeko: ["R"],
  Nidalee: ["Q", "W", "E", "R"],
  Qiyana: ["Q", "W"],
  RekSai: ["Q", "W", "E"],
  Renekton: ["Q", "W", "E", "R"],
  Rell: ["W"],
  Rengar: ["Q", "W", "E"],
  Riven: ["Q", "R"],
  Rumble: ["Q", "W", "E"],
  Shyvana: ["Q", "W", "E", "R"],
  Smolder: ["Q"],
  Sylas: ["E"],
  Swain: ["R"],
  Syndra: ["Q", "W", "E", "R"],
  Udyr: ["Q", "W", "E", "R"],
  Viktor: ["Q", "W", "E", "R"],
  Vladimir: ["Q"],
  Yunara: ["Q", "W", "E", "R"],
};

export function isVariantSkill(championId, skill) {
  return (
    skill.name.includes(" / ") ||
    variantSkillKeys[championId]?.includes(skill.key) === true
  );
}
export function parseFormula(calc, spell, ranks) {
  if (
    calc.__type !== "GameCalculation" ||
    calc.mMultiplier ||
    !calc.mFormulaParts?.length
  )
    return null;
  const parts = [];
  for (const part of calc.mFormulaParts) {
    let values,
      stat = null;
    if (part.__type === "NumberCalculationPart") values = [part.mNumber];
    else if (
      [
        "NamedDataValueCalculationPart",
        "StatByNamedDataValueCalculationPart",
      ].includes(part.__type)
    )
      values = spell.DataValues?.find(
        (v) => v.name.toLowerCase() === String(part.mDataValue).toLowerCase(),
      )?.values?.slice(1, ranks + 1);
    else if (part.__type === "StatByCoefficientCalculationPart")
      values = [part.mCoefficient];
    else return null;
    if (!values?.length || !values.every(Number.isFinite)) return null;
    if (part.__type.startsWith("StatBy")) {
      const type = part.mStat ?? 0;
      if (![0, 2].includes(type)) return null;
      stat = type === 0 ? "AP" : "AD";
      if (type === 2) {
        const name = String(part.mDataValue || "");
        if (/bonus|^bAD/i.test(name)) stat = "추가 AD";
        else if (/total|^tAD/i.test(name)) stat = "총 AD";
        else stat = "AD (기본·추가 범위 확인 필요)";
      }
    }
    values = values.map(round);
    if (values.every((v) => v === values[0])) values = [values[0]];
    parts.push({ stat, values });
  }
  return parts;
}
const ccDefinitions = [
  ["기절", /기절/, "이동·공격·스킬 사용을 잠깐 막아요."],
  [
    "속박",
    /속박|제자리에 묶|발을 묶/,
    "이동을 막아요. 기본 공격과 일부 스킬은 가능해요.",
  ],
  ["침묵", /침묵/, "스킬 사용을 막아요. 이동과 기본 공격은 가능해요."],
  [
    "둔화",
    /둔화|이동 속도를 (?:느리|늦|감소)|속도가 느려|속도를 늦|이동 속도를 훔/,
    "걷는 속도를 느리게 해요.",
  ],
  // "공중으로 도약/뛰어오름"은 시전자의 이동이므로 적 제어기로 세지 않는다.
  ["공중에 띄우기", /공중(?:으로|에)\s*띄/, "공중으로 띄워 잠깐 행동을 막아요."],
  ["밀어내기", /밀쳐|밀어내|밀어냅/, "상대의 위치를 뒤로 밀어요."],
  ["끌어오기", /끌어당|끌어옵|끌어오/, "상대의 위치를 강제로 당겨요."],
  ["공포", /공포/, "겁에 질려 잠깐 도망가게 해요."],
  ["매혹", /매혹|홀리|홀린|홀려/, "잠깐 나를 향해 다가오게 해요."],
  ["도발", /도발/, "잠깐 나를 공격하게 만들어요."],
  ["제압", /제압/, "이동과 여러 행동을 강하게 막아요."],
  [
    "수면",
    /수면|잠들/,
    "잠들어 행동할 수 없게 해요. 깨는 조건은 스킬마다 달라요.",
  ],
  ["실명", /실명/, "기본 공격이 빗나가게 해요."],
  ["시야 제한", /시야를 (?:좁|제한)|시야가 좁/, "볼 수 있는 범위를 좁혀요."],
  [
    "공격 속도 감소",
    /공격 속도(?:가|를).{0,20}(?:감소|줄|느리)/,
    "기본 공격을 느리게 해요. 이동 속도 감소와는 달라요.",
  ],
];
export function extractCC(skill, champion) {
  const sentences = skill.original.split(/(?<=[.!?])\s*|\n/).filter(Boolean);
  const effects = [];
  for (const [name, pattern, meaning] of ccDefinitions) {
    const evidence = sentences.find(
      (s) => pattern.test(s) && !/(면역|제거|해제|저항|정화)/.test(s),
    );
    if (evidence) effects.push({ name, meaning, condition: evidence });
  }
  if (champion.id === "Annie" && ["Q", "W", "R"].includes(skill.key))
    effects.push({
      name: "기절 (기본 지속 효과)",
      meaning: "이동·공격·스킬 사용을 잠깐 막아요.",
      condition:
        "방화광이 준비되어 있을 때 공격 스킬을 맞혀야 해요. 항상 기절하는 것은 아니에요.",
    });
  return effects;
}
