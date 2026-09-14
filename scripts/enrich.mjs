// Terminology changes preserve the official description's targets and conditions.
export const terms = {
  "물리 피해":
    "공격력과 관련된 경우가 많은 피해예요. 방어력으로 줄일 수 있어요.",
  "마법 피해":
    "마법 저항력으로 줄일 수 있는 피해예요. AP와 같은 뜻은 아니에요.",
  "고정 피해": "방어력과 마법 저항력으로 줄일 수 없는 피해예요.",
  기절: "잠깐 이동하거나 공격하거나 스킬을 쓰지 못해요.",
  속박: "발이 묶여 이동할 수 없어요. 공격과 일부 스킬은 쓸 수 있어요.",
  침묵: "잠깐 스킬을 쓸 수 없어요. 걷기와 기본 공격은 가능해요.",
  둔화: "걷는 속도가 느려져요.",
  보호막: "체력 대신 공격을 받아주는 임시 덮개예요.",
  "기본 공격": "적을 클릭해서 하는 평소 공격이에요.",
  "공격 속도": "평소 공격을 얼마나 자주 할 수 있는지예요.",
  "이동 속도": "얼마나 빨리 걷는지예요.",
  마나: "스킬을 쓸 때 드는 에너지예요.",
  "재사용 대기시간": "같은 스킬을 다시 쓸 때까지 기다리는 시간이에요.",
  "스킬 가속": "스킬을 다시 쓰기까지 기다리는 시간을 줄여줘요.",
  방어력: "물리 피해를 줄여줘요.",
  "마법 저항력": "마법 피해를 줄여줘요.",
  주문력: "일부 스킬의 힘을 키우는 능력치예요. AP라고도 해요.",
  공격력: "기본 공격과 일부 스킬의 힘을 키워요. AD라고도 해요.",
  치명타:
    "평소보다 강한 기본 공격이 나오는 효과예요. 챔피언에 따라 다르게 작동할 수 있어요.",
  강인함: "일부 방해 효과에 걸려 있는 시간을 줄여줘요.",
  공중: "공중으로 뜬 동안에는 행동하기 어려워요.",
  적중: "공격이 상대에게 맞았다는 뜻이에요.",
  중첩: "같은 효과가 여러 번 쌓여요.",
  아군: "우리 편이에요.",
  유닛: "챔피언, 미니언처럼 게임 속에서 움직이는 대상을 말해요.",
};
export function simplify(original) {
  return original
    .replace(/<[^>]*>/g, "")
    .replace(/피해를 입힙니다/g, "피해를 줘요")
    .replace(/피해를 입히고/g, "피해를 주고")
    .replace(/피해를 입히며/g, "피해를 주며")
    .replace(/감소합니다/g, "줄어들어요")
    .replace(/증가합니다/g, "늘어나요")
    .replace(/회복합니다/g, "회복해요")
    .replace(/기절시킵니다/g, "잠깐 이동·공격·스킬 사용을 못 하게 해요")
    .replace(/둔화시킵니다/g, "이동을 느리게 해요")
    .replace(/합니다/g, "해요")
    .replace(/됩니다/g, "돼요")
    .replace(/있습니다/g, "있어요");
}
export function classifyItem(e) {
  const t = new Set(e.tags),
    s = e.stats || {},
    roles = [];
  if (
    s.FlatPhysicalDamageMod > 0 ||
    t.has("Damage") ||
    t.has("CriticalStrike") ||
    t.has("AttackSpeed")
  )
    roles.push("AD");
  if (s.FlatMagicDamageMod > 0 || t.has("SpellDamage")) roles.push("AP");
  if (
    t.has("Armor") ||
    t.has("SpellBlock") ||
    t.has("Health") ||
    s.FlatHPPoolMod > 0
  )
    roles.push("탱커");
  // Ally healing/shielding and vision are support utilities, not mere mana regeneration.
  if (
    t.has("GoldPer") ||
    t.has("Vision") ||
    /아군.{0,45}(회복|보호막)|회복 및 보호막|와드/.test(e.original)
  )
    roles.push("서포터");
  if (!roles.length || t.has("Boots") || t.has("Consumable"))
    roles.push("공용");
  const uses = [];
  if (roles.includes("AD"))
    uses.push("기본 공격이나 공격력을 사용하는 스킬을 강화할 때 살펴보세요.");
  if (roles.includes("AP"))
    uses.push("주문력에 따라 강해지는 스킬을 키울 때 살펴보세요.");
  if (t.has("Armor")) uses.push("물리 피해를 덜 받고 싶을 때 도움이 돼요.");
  if (t.has("SpellBlock"))
    uses.push("마법 피해를 덜 받고 싶을 때 도움이 돼요.");
  if (t.has("Health"))
    uses.push("최대 체력을 늘려 더 오래 버티는 데 도움이 돼요.");
  if (roles.includes("서포터"))
    uses.push("우리 편을 돕거나 주변을 확인하는 용도를 살펴보세요.");
  if (t.has("Boots")) uses.push("이동을 빠르게 하는 신발이에요.");
  if (t.has("Consumable"))
    uses.push(
      "사용해서 효과를 얻는 소모품이에요. 사용 횟수나 재충전 조건을 확인하세요.",
    );
  if (!uses.length)
    uses.push(
      e.subtitle || "아래 효과를 보고 필요한 상황에 골라 쓰는 준비물이에요.",
    );
  return { roles, uses };
}
export function enrich(e) {
  if (e.kind === "item") return { ...e, ...classifyItem(e) };
  return {
    ...e,
    roles: e.tags
      .map(
        (t) =>
          ({
            Fighter: "전사",
            Tank: "탱커",
            Mage: "마법사",
            Assassin: "암살자",
            Marksman: "원거리 딜러",
            Support: "서포터",
          })[t],
      )
      .filter(Boolean),
    skills: e.skills?.map((s) => ({
      ...s,
      easy: simplify(s.original),
      glossary: Object.entries(terms).filter(([term]) =>
        s.original.includes(term),
      ),
    })),
  };
}
