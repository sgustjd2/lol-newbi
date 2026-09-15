import { initial, initials, byName } from "./search.js";
const $ = (s) => document.querySelector(s);
const FAV_KEY = "lolhanip:favs";
let favs;
try {
  favs = new Set(JSON.parse(localStorage.getItem(FAV_KEY)) || []);
} catch {
  favs = new Set();
}
const favId = (e) => `${e.kind}:${e.id}`;
const isFav = (e) => favs.has(favId(e));
function toggleFav(e) {
  const k = favId(e);
  favs.has(k) ? favs.delete(k) : favs.add(k);
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify([...favs]));
  } catch {}
}
let glossaryEntries = [],
  runesData = { patch: "", sourceTitle: "", sourceUrl: "", notice: "", paths: [] },
  regionStories = {},
  regionTimeline = { updatedAt: "", notice: "", sources: [], events: [] },
  botDuoData = { patch: "", notice: "", sources: [], duos: [] },
  championCounterData = { patch: "", notice: "", champions: {} },
  easterEggData = { updatedAt: "", notice: "", sources: [], eggs: [] },
  selectedInitial = "전체";
let selectedRole = "전체";
let selectedRegion = null;
let showTimeline = false;
let timelineRegion = "전체";
let botDuoView = "tier";
let selectedRunePath = "all";
const REGIONS = [
  "데마시아",
  "녹서스",
  "아이오니아",
  "프렐요드",
  "필트오버",
  "자운",
  "슈리마",
  "타곤",
  "빌지워터",
  "이쉬탈",
  "그림자 군도",
  "밴들 시티",
  "공허",
  "룬테라",
];
const roleOptions = {
  champion: [
    "전체",
    "전사",
    "탱커",
    "마법사",
    "암살자",
    "원거리 딜러",
    "서포터",
  ],
  item: ["전체", "AD", "AP", "브루저", "탱커", "서포터", "공용"],
};
function roleFilters() {
  if ($("#role-filters").dataset.kind === kind) {
    document
      .querySelectorAll("[data-role]")
      .forEach((b) =>
        b.setAttribute("aria-pressed", b.dataset.role === selectedRole),
      );
    return;
  }
  $("#role-filters").dataset.kind = kind;
  $("#role-filters").replaceChildren();
  for (const role of roleOptions[kind] || []) {
    const b = text("button", role);
    b.type = "button";
    b.dataset.role = role;
    b.setAttribute("aria-pressed", role === selectedRole);
    b.onclick = () => {
      selectedRole = role;
      render();
    };
    $("#role-filters").append(b);
  }
  $("#role-filters").hidden = !roleOptions[kind];
  $("#role-help").hidden = !roleOptions[kind];
  $("#role-help").textContent =
    kind === "champion"
      ? "챔피언의 전투 역할이에요. 탑·미드 같은 포지션과는 달라요. 여러 역할에 함께 표시될 수 있어요."
      : "아이템의 능력치·효과에 따른 용도예요. 해당 역할만 쓸 수 있다는 뜻은 아니에요.";
}
let entries = [],
  patch = "",
  kind = "champion",
  lastFocus = null;
const text = (tag, value, cls) => {
  const n = document.createElement(tag);
  n.textContent = value;
  if (cls) n.className = cls;
  return n;
};
function portrait(e) {
  const img = document.createElement("img");
  img.src = e.image;
  img.alt = "";
  img.className = "portrait";
  img.loading = "lazy";
  img.addEventListener(
    "error",
    () => {
      img.removeAttribute("src");
      img.alt = e.name.slice(0, 1);
    },
    { once: true },
  );
  return img;
}
function itemById(id) {
  return entries.find((entry) => entry.kind === "item" && entry.id === String(id));
}
const RUNE_IMAGE_BASE = "https://ddragon.leagueoflegends.com/cdn/img/";
const runeText = (value) => String(value || "").replaceAll("\\n", "\n");
function runePortrait(rune, className = "rune-icon") {
  const img = portrait({
    image: `${RUNE_IMAGE_BASE}${rune.icon}`,
    name: rune.name,
  });
  img.className = className;
  img.alt = rune.name;
  return img;
}
function runeByKey(pathKey, runeKey) {
  const path = (runesData.paths || []).find((item) => item.key === pathKey);
  if (!path) return null;
  for (const [slotIndex, slot] of path.slots.entries()) {
    const rune = slot.runes.find((item) => item.key === runeKey);
    if (rune) return { path, slot, slotIndex, rune };
  }
  return null;
}
const runeSlotTips = [
  "게임에서 가장 크게 느껴지는 방향을 정해요. 내 챔피언이 이 효과를 자주 켤 수 있는지 먼저 봐요.",
  "라인에서 자주 필요한 공격, 회복, 시야 같은 도움을 골라요.",
  "처치에 참여하거나 시간이 지나면서 조금씩 쌓이는 힘을 골라요.",
  "마지막 빈틈을 채우는 줄이에요. 더 세게 때릴지, 더 오래 버틸지 생각해 봐요.",
];
const runeEasySummaries = {
  PressTheAttack: "같은 적을 세 번 때리면 더 아프게 때려요.",
  LethalTempo: "계속 때리면 공격이 빨라지고 더 세져요.",
  FleetFootwork: "움직이고 때리면 힘이 차서 체력을 조금 채워요.",
  Conqueror: "싸울수록 힘이 쌓이고 체력도 조금 회복해요.",
  AbsorbLife: "적을 쓰러뜨리면 체력을 조금 채워요.",
  Triumph: "적을 잡으면 체력을 조금 채우고 돈도 받아요.",
  PresenceOfMind: "적을 때리거나 잡으면 스킬 자원이 조금 돌아와요.",
  LegendAlacrity: "적을 잡는 데 참여할수록 공격이 빨라져요.",
  LegendHaste: "적을 잡는 데 참여할수록 기본 스킬을 빨리 써요.",
  LegendBloodline: "적을 잡을수록 피를 빨아 체력을 채우는 힘이 생겨요.",
  CoupDeGrace: "피가 적은 적에게 더 큰 피해를 줘요.",
  CutDown: "피가 많은 적에게 더 큰 피해를 줘요.",
  LastStand: "내 피가 적을수록 공격이 더 세져요.",
  Electrocute: "같은 적을 세 번 때리면 번개처럼 큰 피해를 줘요.",
  DarkHarvest: "피가 적은 적을 때리면 영혼을 모으고 더 아파져요.",
  HailOfBlades: "처음 세 번 빨리 때릴 때 공격 속도가 아주 빨라져요.",
  CheapShot: "느려지거나 움직이지 못하는 적에게 더 아프게 때려요.",
  TasteOfBlood: "적 챔피언을 때리면 내 체력을 조금 채워요.",
  SuddenImpact: "점프나 돌진 뒤에 적을 때리면 추가 피해를 줘요.",
  SixthSense: "안 보이는 와드를 찾아주는 눈이 생겨요.",
  GrislyMementos: "적을 잡을수록 장신구를 더 빨리 쓸 수 있어요.",
  DeepWard: "적 정글에 둔 와드가 더 튼튼하고 오래가요.",
  TreasureHunter: "적을 잡는 데 참여하면 골드를 더 받아요.",
  RelentlessHunter: "적을 잡을수록 전투 밖에서 더 빨리 달려요.",
  UltimateHunter: "적을 잡을수록 궁극기를 더 빨리 다시 써요.",
  SummonAery: "공격하면 콩콩이가 가서 때리거나 친구를 지켜줘요.",
  ArcaneComet: "스킬로 때리면 하늘에서 유성이 떨어져요.",
  PhaseRush: "적을 빠르게 여러 번 때리면 아주 빨라져요.",
  DeathfireTouch: "스킬로 때리면 적이 불에 타요.",
  NullifyingOrb: "궁극기가 더 세지고 적을 잡으면 더 빨리 돌아와요.",
  ManaflowBand: "적에게 스킬을 맞히면 마나가 늘고 천천히 채워져요.",
  NimbusCloak: "소환사 주문을 쓰면 잠깐 빨라지고 사람을 통과해요.",
  Transcendence: "레벨이 오를수록 스킬을 더 자주 쓸 수 있어요.",
  Celerity: "빨라지는 힘이 더 커져요.",
  AbsoluteFocus: "내 체력이 많을 때 공격이 더 세져요.",
  Scorch: "스킬로 때리면 적을 불태워요.",
  Waterwalking: "강에 있으면 더 빨라지고 공격 힘도 커져요.",
  GatheringStorm: "시간이 지날수록 공격이나 주문 힘이 커져요.",
  GraspOfTheUndying: "가까이서 때리면 체력을 채우고 몸도 튼튼해져요.",
  Aftershock: "적을 움직이지 못하게 하면 잠깐 단단해졌다가 폭발해요.",
  Guardian: "친구를 지켜주고, 위험하면 둘 다 보호막을 얻어요.",
  Demolish: "포탑을 몇 번 때리면 다음 공격이 아주 세져요.",
  FontOfLife: "적을 느리게 하면 친구들이 체력을 채울 수 있어요.",
  ShieldBash: "보호막을 얻은 뒤 다음 공격이 더 세져요.",
  Conditioning: "시간이 지나면 방어력과 마법 저항력이 늘어요.",
  SecondWind: "적에게 맞으면 잃은 체력을 천천히 되찾아요.",
  BonePlating: "적에게 맞은 뒤 이어지는 세 번의 공격을 덜 아프게 맞아요.",
  Overgrowth: "주변 미니언이나 몬스터가 죽으면 최대 체력이 늘어요.",
  Revitalize: "회복과 보호막이 더 좋아지고, 피가 적으면 더 강해져요.",
  Unflinching: "기절이나 느려짐을 맞으면 잠깐 더 단단해져요.",
  GlacialAugment: "적을 묶으면 얼음 길이 생겨 주변 적이 느려져요.",
  UnsealedSpellbook: "필요할 때 소환사 주문을 다른 주문으로 바꿔 써요.",
  FirstStrike: "먼저 때리면 잠깐 더 세게 때리고 돈도 벌어요.",
  HextechFlashtraption: "점멸이 없을 때 잠깐 충전해서 다른 곳으로 이동해요.",
  MagicalFootwear: "조금 기다리면 공짜 신발을 받아요.",
  CashBack: "비싼 아이템을 사면 돈을 조금 돌려받아요.",
  PerfectTiming: "레벨이 오를 때마다 다른 영약을 하나씩 받아요.",
  TimeWarpTonic: "물약을 먹으면 체력을 바로 조금 채워요.",
  BiscuitDelivery: "시간마다 비스킷을 받아 먹고 체력을 늘려요.",
  CosmicInsight: "소환사 주문과 아이템을 더 빨리 다시 쓸 수 있어요.",
  ApproachVelocity: "느려진 적에게 다가갈 때 더 빨라져요.",
  JackOfAllTrades: "여러 능력치 아이템을 사면 스킬을 더 자주 써요.",
};
function runeEasySummary(rune) {
  return rune.easySummary || runeEasySummaries[rune.key] || rune.summary;
}
const runePathOrder = ["Precision", "Domination", "Sorcery", "Resolve", "Inspiration"];
const orderedRunePaths = () =>
  [...(runesData.paths || [])].sort(
    (a, b) =>
      (runePathOrder.indexOf(a.key) < 0 ? 99 : runePathOrder.indexOf(a.key)) -
      (runePathOrder.indexOf(b.key) < 0 ? 99 : runePathOrder.indexOf(b.key)),
  );
function runePickTip(path, slotIndex) {
  return `${path.name}의 ${path.slots[slotIndex]?.label || "특성"}이에요. ${runeSlotTips[slotIndex] || "내가 하려는 플레이와 효과가 잘 맞는지 살펴봐요."}`;
}
function runeCard(path, slot, slotIndex, rune) {
  const card = text("button", "", "rune-card");
  card.type = "button";
  card.setAttribute("aria-label", `${path.name} · ${rune.name} 특성 자세히 보기`);
  card.append(
    text("div", "", "rune-card-head"),
    text("p", runeText(runeEasySummary(rune)), "rune-summary"),
    text("span", "자세한 설명 보기 ↗", "rune-card-action"),
  );
  const head = card.firstElementChild;
  head.append(runePortrait(rune), text("span", rune.name));
  card.onclick = () => {
    lastFocus = card;
    location.hash = `rune/${path.key}/${rune.key}`;
  };
  return card;
}
function renderRunes(q) {
  const terms = q.split(/\s+/).filter(Boolean);
  const availablePaths = orderedRunePaths().filter(
    (path) => selectedRunePath === "all" || path.key === selectedRunePath,
  );
  const groups = availablePaths
    .map((path) => ({
      path,
      slots: path.slots
        .map((slot, slotIndex) => ({
          ...slot,
          slotIndex,
          runes: slot.runes.filter((rune) =>
            terms.every((term) =>
              norm(
                [
                  path.name,
                  path.key,
                  path.subtitle,
                  path.easy,
                  rune.name,
                  rune.key,
                  rune.summary,
                  rune.detail,
                ].join(" "),
              ).includes(term),
            ),
          ),
        }))
        .filter((slot) => slot.runes.length),
    }))
    .filter((group) => group.slots.length);
  const runeCount = groups.reduce(
    (count, group) =>
      count + group.slots.reduce((slotCount, slot) => slotCount + slot.runes.length, 0),
    0,
  );
  const pathLabel = `${groups.length}개 마스터리`;
  $("#count").textContent = `${runeCount}개 특성 · ${pathLabel}`;
  $("#grid").replaceChildren();

  const intro = text("div", "", "rune-intro");
  intro.append(
    text(
      "p",
      "예전에는 마스터리라고도 불렀어요. 게임을 어떻게 풀어갈지 정하는 특성이에요.",
    ),
    text(
      "p",
      "처치 관여는 킬을 직접 하거나 도운 것, 적응형 피해는 공격력·주문력 중 더 잘 맞는 쪽으로 바뀌는 피해예요.",
      "rune-intro-note",
    ),
  );
  $("#grid").append(intro);
  const pathTabs = text("div", "", "rune-path-tabs");
  pathTabs.setAttribute("role", "group");
  pathTabs.setAttribute("aria-label", "특성 마스터리 선택");
  const allPaths = [{ key: "all", name: "전체", easy: "" }, ...orderedRunePaths()];
  for (const path of allPaths) {
    const button = text("button", path.name);
    button.type = "button";
    button.setAttribute("aria-pressed", String(selectedRunePath === path.key));
    button.onclick = () => {
      selectedRunePath = path.key;
      render();
    };
    pathTabs.append(button);
  }
  $("#grid").append(pathTabs);

  for (const { path, slots } of groups) {
    const section = text("section", "", "rune-path");
    const header = text("div", "", "rune-path-head");
    header.append(
      runePortrait({ name: path.name, icon: path.icon }, "rune-path-icon"),
      text("div", "", "rune-path-heading"),
    );
    const heading = header.lastElementChild;
    heading.append(text("h3", path.name), text("span", path.subtitle, "rune-path-subtitle"));
    section.append(header, text("p", path.easy, "rune-path-copy"));
    const slotGrid = text("div", "", "rune-slot-list");
    for (const slot of slots) {
      const slotBlock = text("div", "", "rune-slot");
      slotBlock.append(
        text("h4", slot.label),
        text("p", runePickTip(path, slot.slotIndex), "rune-slot-help"),
      );
      const choices = text("div", "", "rune-choice-grid");
      for (const rune of slot.runes) choices.append(runeCard(path, slot, slot.slotIndex, rune));
      slotBlock.append(choices);
      slotGrid.append(slotBlock);
    }
    section.append(slotGrid);
    $("#grid").append(section);
  }
  if (!groups.length)
    $("#grid").append(
      text("p", "찾는 특성이 없어요. 다른 이름이나 마스터리로 검색해 보세요.", "empty"),
    );
  const note = text("div", "", "rune-source-note");
  note.append(text("p", runesData.notice || "특성 효과는 패치에 따라 달라질 수 있어요."));
  const source = text("a", `${runesData.sourceTitle || "Data Dragon 공식 데이터"} · ${runesData.patch || patch} ↗`);
  source.href = runesData.sourceUrl;
  source.target = "_blank";
  source.rel = "noopener noreferrer";
  note.append(source);
  $("#grid").append(note);
  scheduleCardAlignment();
}
function recipeCard(item, current = false) {
  const card = text(
    current ? "div" : "button",
    "",
    current ? "recipe-current" : "recipe-item",
  );
  if (!current) {
    card.type = "button";
    card.setAttribute("aria-label", `${item.name} 상세 보기`);
    card.title = `${item.name} 상세 보기`;
    card.onclick = () => {
      lastFocus = card;
      location.hash = `item/${item.id}`;
    };
  }
  const icon = portrait(item);
  icon.className = "recipe-icon";
  icon.alt = item.name;
  card.append(icon, text("span", item.name));
  return card;
}
function recipeFlow(item, target, direction = "forward") {
  const flow = text("div", "", "recipe-flow");
  if (direction === "backward") {
    flow.append(recipeCard(item, true), text("span", "→", "recipe-arrow"), recipeCard(target));
    return flow;
  }
  target.forEach((component, index) => {
    if (index) flow.append(text("span", "＋", "recipe-join"));
    flow.append(recipeCard(component));
  });
  flow.append(text("span", "→", "recipe-arrow"), recipeCard(item, true));
  return flow;
}
const norm = (s) => String(s ?? "").normalize("NFKC").replace(/\s+/g, "").toLowerCase();
const relationMeta = {
  hostile: { label: "적대", description: "서로 맞서거나 경계하는 관계" },
  friendly: { label: "친화", description: "서로 돕거나 가까운 관계" },
  neutral: { label: "중립", description: "같은 세계에 있지만 특별한 감정은 확인되지 않은 관계" },
};
const relationWords = {
  hostile: [
    "적대",
    "원수",
    "라이벌",
    "호적수",
    "숙적",
    "적수",
    "혐오",
    "증오",
    "대립",
    "맞서",
    "싸우",
    "죽였",
    "죽이",
    "몰살",
    "복수",
    "사냥",
    "위협",
    "싫어",
    "배신",
    "경멸",
    "추격",
    "쫓아",
  ],
  friendly: [
    "친구",
    "친한",
    "가까운",
    "가까워",
    "동료",
    "동맹",
    "연인",
    "사랑",
    "우호",
    "협력",
    "함께",
    "도와",
    "사제",
    "스승",
    "제자",
    "가족",
    "자매",
    "형제",
    "아버지",
    "아들",
    "딸",
    "남편",
    "아내",
    "파트너",
    "동반자",
    "신뢰",
    "호감",
    "손을잡",
    "지켜",
    "보호",
    "존경",
    "의남매",
    "부녀",
    "부부",
    "사이가좋",
  ],
};
function relationTypeForLabel(label) {
  const value = norm(label);
  if (!value || value === "-") return "neutral";
  for (const [type, words] of Object.entries(relationWords))
    if (words.some((word) => value.includes(word))) return type;
  return "neutral";
}
function relationTypeForContext(name, paragraphs, labelHint) {
  const hinted = relationTypeForLabel(labelHint);
  const nameValue = norm(name);
  const scores = { hostile: 0, friendly: 0 };
  const sentences = paragraphs.flatMap((paragraph) =>
    paragraph.split(/(?<=[.!?。！？])\s+/),
  );
  for (const sentence of sentences) {
    const sentenceValue = norm(sentence);
    const at = sentenceValue.indexOf(nameValue);
    if (at < 0) continue;
    const context = sentenceValue.slice(Math.max(0, at - 58), at + nameValue.length + 58);
    for (const type of ["hostile", "friendly"])
      scores[type] += relationWords[type].filter((word) => context.includes(word)).length;
  }
  const allText = norm(paragraphs.join(" "));
  if (/그외의모든챔피언.*적대관계|모든챔피언.*적대관계/.test(allText))
    scores.hostile += 1;
  if (/모두우호|전부우호|모든챔피언.*우호/.test(allText)) scores.friendly += 1;
  if (hinted !== "neutral") {
    const other = hinted === "hostile" ? "friendly" : "hostile";
    if (scores[other] > scores[hinted] + 1) return other;
    return hinted;
  }
  if (scores.hostile > scores.friendly) return "hostile";
  if (scores.friendly > scores.hostile) return "friendly";
  return "neutral";
}
function loreRelations(loreText, currentId) {
  const blocks = String(loreText || "")
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);
  const marker = blocks.findIndex((block) => /^2\.1\.\s*챔피언 관계/.test(block));
  if (marker < 0) return { related: [], paragraphs: blocks };

  const champions = new Map(
    entries
      .filter((entry) => entry.kind === "champion")
      .map((entry) => [norm(entry.name), entry]),
  );
  const related = [];
  const seen = new Set();
  const rawNames = [];
  const labels = [];
  let proseStart = blocks.length;
  for (let index = marker + 1; index < blocks.length; index += 1) {
    const block = blocks[index];
    const champion = champions.get(norm(block));
    if (champion) {
      rawNames.push(champion);
      continue;
    }
    // Some lore pages put relationship labels between the names. Keep
    // scanning those short labels, then stop when the actual prose begins.
    if (block.length <= 40 && !/[.!?。！？]$/.test(block)) {
      labels.push(block);
      continue;
    }
    proseStart = index;
    break;
  }

  const labelById = new Map();
  labels.slice(0, rawNames.length).forEach((label, index) => {
    const champion = rawNames[index];
    if (champion && !labelById.has(champion.id)) labelById.set(champion.id, label);
  });
  for (const champion of rawNames) {
    if (champion.id === currentId || seen.has(champion.id)) continue;
    seen.add(champion.id);
    const type = relationTypeForContext(
      champion.name,
      blocks.slice(proseStart),
      labelById.get(champion.id),
    );
    related.push({ entry: champion, type, ...relationMeta[type] });
  }

  return {
    related,
    paragraphs: blocks.slice(0, marker).concat(blocks.slice(proseStart)),
  };
}
function cardEl(e) {
  const card = text("button", "", "card");
  card.type = "button";
  card.setAttribute("aria-label", `${e.name} 설명 보기`);
  const cardId = `entry-card-${e.kind}-${String(e.id).replace(/[^a-z0-9_-]/gi, "-")}`;
  card.id = cardId;
  const top = text("div", "", "card-top");
  const names = text("div", "");
  names.append(text("h3", e.name), text("span", e.subtitle, "subtitle"));
  top.append(portrait(e), names);
  if (e.roles) names.append(text("span", e.roles.join(" · "), "role-label"));
  const bottom = text("div", "", "card-bottom");
  bottom.append(
    text(
      "span",
      e.summary
        ? e.reviewed === true
          ? "자료 검수 완료"
          : "쉬운 설명 · 편집 예시"
        : "쉬운 설명 준비 중",
      `badge ${e.summary ? "" : "pending"}`,
    ),
    text("span", "↗", "arrow"),
  );
  card.append(
    top,
    text("p", e.summary || "아직 쉽게 풀고 있어요. 공식 설명을 먼저 볼 수 있어요."),
    bottom,
  );
  card.addEventListener("click", () => {
    lastFocus = card;
    location.hash = `${e.kind}/${e.id}`;
  });
  const wrap = text("div", "", "card-wrap");
  const cardView =
    e.kind === "champion"
      ? text("button", "캐릭터 카드 보기", "card-view-button")
      : null;
  if (cardView) {
    cardView.type = "button";
    cardView.setAttribute("aria-label", `${e.name} 캐릭터 카드 보기`);
    cardView.onclick = (event) => {
      event.stopPropagation();
      lastFocus = cardView;
      location.hash = `card/champion/${e.id}`;
    };
  }
  const fav = text("button", isFav(e) ? "★" : "☆", `fav${isFav(e) ? " on" : ""}`);
  fav.type = "button";
  fav.title = "즐겨찾기";
  fav.setAttribute("aria-label", `${e.name} 즐겨찾기`);
  fav.setAttribute("aria-pressed", isFav(e));
  fav.onclick = () => {
    toggleFav(e);
    const on = isFav(e);
    fav.textContent = on ? "★" : "☆";
    fav.classList.toggle("on", on);
    fav.setAttribute("aria-pressed", on);
    if (kind === "favorite") render();
  };
  wrap.append(card);
  if (cardView) wrap.append(cardView);
  wrap.append(fav);
  return wrap;
}

// Keep the same visual rows aligned even when names, role labels, or summaries
// wrap to different numbers of lines. Heights are scoped to each grid row so
// responsive layouts stay roomy without forcing every card to be as tall as
// the longest entry in the entire list.
let alignmentFrame = 0;
function cardsByVisualRow(selector) {
  const groups = new Map();
  document.querySelectorAll(selector).forEach((card) => {
    const top = Math.round(card.getBoundingClientRect().top);
    const group = groups.get(top) || [];
    group.push(card);
    groups.set(top, group);
  });
  return groups.values();
}
function equalizeCards() {
  const cards = [...document.querySelectorAll("#grid > .card-wrap > .card")];
  cards.forEach((card) => {
    card.style.removeProperty("--card-top-height");
    card.style.removeProperty("--card-summary-height");
  });
  for (const row of cardsByVisualRow("#grid > .card-wrap > .card")) {
    let topHeight = 0;
    let summaryHeight = 0;
    for (const card of row) {
      topHeight = Math.max(topHeight, card.querySelector(".card-top")?.getBoundingClientRect().height || 0);
      summaryHeight = Math.max(summaryHeight, card.querySelector(":scope > p")?.getBoundingClientRect().height || 0);
    }
    for (const card of row) {
      card.style.setProperty("--card-top-height", `${topHeight}px`);
      card.style.setProperty("--card-summary-height", `${summaryHeight}px`);
    }
  }
}
function equalizeTermCards() {
  const cards = [...document.querySelectorAll("#grid > .term-card")];
  const vars = [
    "--term-category-height",
    "--term-title-height",
    "--term-alias-height",
    "--term-meaning-height",
  ];
  cards.forEach((card) => vars.forEach((name) => card.style.removeProperty(name)));
  for (const row of cardsByVisualRow("#grid > .term-card")) {
    const heights = [0, 0, 0, 0];
    for (const card of row) {
      const nodes = [
        card.querySelector(":scope > .badge"),
        card.querySelector(":scope > h3"),
        card.querySelector(":scope > .subtitle"),
        card.querySelector(":scope > p:not(.term-example)"),
      ];
      nodes.forEach((node, index) => {
        heights[index] = Math.max(heights[index], node?.getBoundingClientRect().height || 0);
      });
    }
    for (const card of row)
      vars.forEach((name, index) => card.style.setProperty(name, `${heights[index]}px`));
  }
}
function equalizeRuneCards() {
  document.querySelectorAll(".rune-choice-grid").forEach((grid) => {
    const cards = [...grid.querySelectorAll(":scope > .rune-card")];
    cards.forEach((card) => card.style.removeProperty("--rune-card-height"));
    if (!cards.length) return;
    const maxHeight = Math.max(...cards.map((card) => card.getBoundingClientRect().height));
    cards.forEach((card) => card.style.setProperty("--rune-card-height", `${maxHeight}px`));
  });
}
function scheduleCardAlignment() {
  if (alignmentFrame) cancelAnimationFrame(alignmentFrame);
  alignmentFrame = requestAnimationFrame(() => {
    alignmentFrame = 0;
    equalizeCards();
    equalizeTermCards();
    equalizeRuneCards();
  });
}
function championById(id) {
  return entries.find((entry) => entry.kind === "champion" && entry.id === id);
}
const counterLaneLabels = {
  top: "탑",
  middle: "미드",
  bottom: "봇",
  jungle: "정글",
  support: "서포터",
};
function championCounterSection(champion) {
  if (champion.kind !== "champion") return null;
  const data = championCounterData.champions?.[champion.id];
  if (!data?.counters?.length) return null;

  const section = text("section", "", "detail-block champion-counters");
  section.append(text("h3", "대표 카운터 픽"));
  section.append(
    text(
      "p",
      "상대하기 좋은 챔피언을 세 명 보여줘요. 아이콘을 누르면 왜 좋은지와 초보자용 활용 포인트를 쉽게 볼 수 있어요.",
      "counter-help",
    ),
  );
  const list = text("div", "", "champion-counter-list");
  let openReason = null;
  let openButton = null;
  for (const counter of data.counters) {
    const target = championById(counter.id);
    if (!target) continue;
    const item = text("div", "", "champion-counter-item");
    const button = text("button", "", "champion-counter-chip");
    button.type = "button";
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-label", `${target.name} 카운터 이유 보기`);
    const icon = portrait(target);
    icon.className = "champion-counter-icon";
    icon.alt = target.name;
    button.append(icon, text("span", target.name, "champion-counter-name"));
    const detail = text("div", "", "champion-counter-detail");
    detail.hidden = true;
    detail.append(
      text("p", `카운터 이유 · ${counter.reason}`, "champion-counter-reason"),
      text(
        "p",
        `초보자 포인트 · ${counter.tip || "핵심 스킬이 빠진 순간을 노리면 장점을 살리기 쉬워요."}`,
        "champion-counter-tip",
      ),
    );
    button.onclick = () => {
      if (openReason && openReason !== detail) {
        openReason.hidden = true;
        openButton?.setAttribute("aria-expanded", "false");
      }
      const expanded = detail.hidden;
      detail.hidden = !expanded;
      button.setAttribute("aria-expanded", String(expanded));
      openReason = expanded ? detail : null;
      openButton = expanded ? button : null;
    };
    item.append(button, detail);
    list.append(item);
  }
  section.append(list);
  const lane = counterLaneLabels[data.lane] || "전체 역할";
  const source = text(
    "a",
    `LoLalytics ${lane} 카운터 참고 · 패치 ${championCounterData.patch || patch} ↗`,
    "counter-source",
  );
  source.href = data.sourceUrl;
  source.target = "_blank";
  source.rel = "noopener noreferrer";
  section.append(source);
  return section;
}
function arenaAugmentSection(champion) {
  if (champion.kind !== "champion" || !champion.arena?.recommendations?.length)
    return null;

  const section = text("section", "", "detail-block arena-augments");
  section.append(text("h3", `${champion.arena.mode || "증바람"} 추천 증강 카드`));
  section.append(text("p", champion.arena.notice, "arena-augment-help"));
  section.append(text("p", champion.arena.summary, "arena-augment-summary"));
  const list = text("div", "", "arena-augment-list");
  for (const recommendation of champion.arena.recommendations) {
    const card = text("article", "", "arena-augment-card");
    const head = text("div", "", "arena-augment-head");
    head.append(
      text("span", recommendation.category || "대표 카드", "arena-augment-category"),
      text("strong", recommendation.name, "arena-augment-name"),
    );
    card.append(head, text("p", recommendation.reason, "arena-augment-reason"));
    list.append(card);
  }
  section.append(list);
  const source = text("a", `${champion.arena.sourceTitle} ↗`, "arena-augment-source");
  source.href = champion.arena.sourceUrl;
  source.target = "_blank";
  source.rel = "noopener noreferrer";
  section.append(source);
  return section;
}
function characterCardSection(title, className = "") {
  const section = text("section", "", `character-card-section ${className}`.trim());
  section.append(text("h3", title));
  return section;
}
function characterCardSkillCopy(skill) {
  return skill.easy || skill.original || "아직 쉽게 풀어 쓴 설명을 준비하고 있어요.";
}
function characterCardItem(item) {
  const resolved = typeof item === "string" ? itemById(item) : item;
  if (!resolved?.name) return null;
  const itemCard = text("div", "", "character-card-item");
  const icon = portrait(resolved);
  icon.className = "character-card-item-icon";
  icon.alt = resolved.name;
  itemCard.append(icon, text("span", resolved.name, "character-card-item-name"));
  return itemCard;
}
function renderCharacterCard(champion) {
  const mount = $("#character-card");
  mount.replaceChildren();
  const article = text("article", "", "character-card");
  article.setAttribute("aria-labelledby", "character-card-title");

  const hero = text("header", "", "character-card-hero");
  const identity = text("div", "", "character-card-identity");
  identity.append(
    text("p", "CHAMPION CARD · 5살도 알아듣게", "character-card-kicker"),
    text("h2", champion.name),
    text("p", champion.subtitle || "챔피언", "character-card-subtitle"),
  );
  identity.lastElementChild.previousElementSibling.id = "character-card-title";
  if (champion.roles?.length) {
    const roles = text("div", "", "character-card-roles");
    champion.roles.forEach((role) => roles.append(text("span", role, "character-card-role")));
    identity.append(roles);
  }
  const heroImage = portrait(champion);
  heroImage.className = "character-card-portrait";
  heroImage.alt = champion.name;
  hero.append(identity, heroImage);

  const quick = characterCardSection("한눈에 보기", "character-card-quick-section");
  quick.append(
    text("p", "이 친구는 무엇을 잘할까요? 아래 설명을 읽으면 바로 감이 와요.", "character-card-help"),
  );
  const quickGrid = text("div", "", "character-card-quick");
  for (const [title, value] of [
    ["어떤 친구인가요?", champion.summary],
    ["어떻게 움직이나요?", champion.analogy || champion.tip],
  ]) {
    if (!value) continue;
    const box = text("div", "", "character-card-quick-box");
    box.append(text("h4", title), text("p", value));
    quickGrid.append(box);
  }
  if (champion.tip && champion.analogy) {
    const box = text("div", "", "character-card-quick-box");
    box.append(text("h4", "처음 기억할 것", "character-card-tip-title"), text("p", champion.tip));
    quickGrid.append(box);
  }
  if (champion.caution) {
    const box = text("div", "", "character-card-quick-box character-card-caution");
    box.append(text("h4", "조심할 것"), text("p", champion.caution));
    quickGrid.append(box);
  }
  quick.append(quickGrid);

  const skills = characterCardSection("스킬 설명", "character-card-skills");
  skills.append(
    text("p", "P는 자동으로 도와주는 힘이에요. Q W E R은 키를 눌러 써요.", "character-card-help"),
  );
  const skillGrid = text("div", "", "character-card-skill-grid");
  const allSkills = [];
  if (champion.passive) allSkills.push({ key: "P", name: champion.passive.name, image: champion.passive.image, easy: `평소에도 자동으로 도움을 주는 힘이에요. ${String(champion.passive.original || "").replace(/\s+/g, " ").trim()}` });
  allSkills.push(...(champion.skills || []));
  allSkills.forEach((skill) => {
    const skillCard = text("article", "", "character-card-skill");
    const head = text("div", "", "character-card-skill-head");
    const icon = portrait(skill);
    icon.className = "character-card-skill-icon";
    icon.alt = `${skill.key} ${skill.name}`;
    const key = text("span", skill.key, "character-card-skill-key");
    const name = text("strong", skill.name, "character-card-skill-name");
    head.append(icon, key, name);
    skillCard.append(head, text("p", skill.key === "P" ? skill.easy : characterCardSkillCopy(skill), "character-card-skill-copy"));
    skillGrid.append(skillCard);
  });
  skills.append(skillGrid);

  const counterData = championCounterData.champions?.[champion.id];
  const counters = characterCardSection("카운터 픽", "character-card-counters");
  counters.append(
    text("p", "이 챔피언을 만나면 힘들 수 있어요. 상대의 약점을 찌르는 친구들을 골라 봤어요.", "character-card-help"),
  );
  const counterGrid = text("div", "", "character-card-counter-grid");
  for (const counter of counterData?.counters || []) {
    const target = championById(counter.id);
    if (!target) continue;
    const counterCard = text("article", "", "character-card-counter");
    const head = text("div", "", "character-card-counter-head");
    const icon = portrait(target);
    icon.className = "character-card-counter-icon";
    icon.alt = target.name;
    head.append(icon, text("strong", target.name, "character-card-counter-name"));
    counterCard.append(
      head,
      text("p", counter.reason || "상대의 약점을 잘 찌를 수 있어요.", "character-card-counter-reason"),
      text("p", `초보자 포인트 · ${counter.tip || "상대의 핵심 스킬이 빠진 순간을 노려 보세요."}`, "character-card-counter-tip"),
    );
    counterGrid.append(counterCard);
  }
  if (!counterGrid.children.length)
    counterGrid.append(text("p", "아직 대표 카운터 자료를 준비하고 있어요.", "character-card-empty"));
  counters.append(counterGrid);

  const builds = characterCardSection("추천 아이템", "character-card-builds");
  builds.append(
    text("p", "처음에는 아래 아이템부터 살펴보면 좋아요. 게임 모드에 따라 조금 달라질 수 있어요.", "character-card-help"),
  );
  const buildLabels = {
    start: "시작 아이템",
    boots: "신발",
    core: "핵심 아이템",
    situational: "상황에 따라",
  };
  const buildModes = [
    ["rift", "소환사의 협곡"],
    ["aram", "칼바람 나락"],
  ];
  let buildCount = 0;
  for (const [mode, modeLabel] of buildModes) {
    const rows = champion.builds?.[mode];
    if (!rows) continue;
    const modeTitle = text("h4", modeLabel, "character-card-mode-title");
    builds.append(modeTitle);
    for (const [key, items] of Object.entries(rows)) {
      if (!items?.length) continue;
      const row = text("div", "", "character-card-build");
      row.append(text("strong", buildLabels[key] || key, "character-card-build-label"));
      const itemList = text("div", "", "character-card-item-list");
      items.forEach((item) => {
        const itemCard = characterCardItem(item);
        if (itemCard) itemList.append(itemCard);
      });
      if (!itemList.children.length) continue;
      row.append(itemList);
      builds.append(row);
      buildCount += itemList.children.length;
    }
  }
  if (!buildCount)
    builds.append(text("p", "아직 추천 아이템 자료를 준비하고 있어요.", "character-card-empty"));

  article.append(hero, quick, skills, counters, builds);
  article.append(text("p", `자료 버전 ${patch} · 쉬운 설명과 공개 데이터로 만든 카드`, "character-card-footer"));
  mount.append(article);
}
function showDictionary() {
  $("#intro").hidden = false;
  $("#dictionary").hidden = false;
  $("#data-note").hidden = false;
  $("#character-card-page").hidden = true;
  document.body.classList.remove("character-card-mode");
  document.title = "롤린이 백과사전 — 5살도 이해하는 쉬운 롤 설명";
}
function showCharacterCard(champion) {
  if ($("#detail").open) $("#detail").close();
  $("#intro").hidden = true;
  $("#dictionary").hidden = true;
  $("#data-note").hidden = true;
  $("#character-card-page").hidden = false;
  document.body.classList.add("character-card-mode");
  document.title = `${champion.name} 캐릭터 카드 · 롤린이 백과사전`;
  renderCharacterCard(champion);
  window.scrollTo({ top: 0, behavior: "auto" });
}
function syncRoute() {
  const [type, scope, id] = location.hash.slice(1).split("/");
  if (type === "card" && scope === "champion") {
    const champion = championById(id);
    if (champion) {
      showCharacterCard(champion);
      return;
    }
  }
  showDictionary();
  openDetail();
}
function duoChampionButton(id, role, compact = false) {
  const champion = championById(id);
  if (!champion) return text("span", id, "duo-missing-champion");
  const button = text("button", "", `duo-champion${compact ? " compact" : ""}`);
  button.type = "button";
  button.title = `${champion.name} 챔피언 설명 보기`;
  button.setAttribute("aria-label", `${role} ${champion.name} 챔피언 설명 보기`);
  const icon = portrait(champion);
  icon.alt = champion.name;
  button.append(icon, text("span", champion.name, "duo-champion-name"));
  if (!compact) button.append(text("small", role, "duo-champion-role"));
  button.onclick = () => {
    lastFocus = button;
    location.hash = `champion/${champion.id}`;
  };
  return button;
}
function duoPair(adc, support, compact = false) {
  const pair = text("div", "", `duo-pair${compact ? " compact" : ""}`);
  const adcEntry = championById(adc);
  const adcRole = adcEntry?.roles?.includes("원거리 딜러") ? "원거리 딜러" : "봇 챔피언";
  pair.append(
    duoChampionButton(adc, adcRole, compact),
    text("span", "＋", "duo-plus"),
    duoChampionButton(support, "서포터", compact),
  );
  return pair;
}
function botDuoCard(duo) {
  const card = text("article", "", "duo-card");
  const head = text("div", "", "duo-card-head");
  const title = text("div", "", "duo-card-title");
  const adc = championById(duo.adc);
  const support = championById(duo.support);
  const pairName = `${adc?.name || duo.adc} ＋ ${support?.name || duo.support}`;
  title.append(
    text("span", duo.tier, "duo-tier"),
    text("h3", pairName),
  );
  const actions = text("div", "", "duo-card-actions");
  actions.append(duoPair(duo.adc, duo.support));
  const bodyId = `duo-details-${String(duo.id).replace(/[^a-z0-9_-]/gi, "-")}`;
  const toggle = text("button", "＋ 설명 펼치기", "duo-card-toggle");
  toggle.type = "button";
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-controls", bodyId);
  toggle.setAttribute("aria-label", `${pairName} 상세 설명 펼치기`);
  actions.append(toggle);
  head.append(title, actions);
  const body = text("div", "", "duo-card-body");
  body.id = bodyId;
  body.hidden = true;
  body.append(text("p", duo.summary, "duo-summary"));
  const tags = text("div", "", "duo-tags");
  for (const tag of duo.tags || []) tags.append(text("span", tag));
  body.append(tags);
  const why = text("section", "", "duo-reasons");
  why.append(text("h4", "왜 잘 맞을까요?"));
  for (const point of duo.why || []) why.append(text("p", point));
  body.append(why, text("p", duo.plan, "duo-plan"));
  if (duo.stat) body.append(text("p", duo.stat, "duo-stat"));
  const counters = text("section", "", "duo-counters");
  counters.append(text("h4", "카운터 픽 · 이렇게 상대해요"));
  for (const counter of duo.counters || []) {
    const counterRow = text("div", "", "duo-counter-row");
    counterRow.append(
      duoPair(counter.adc, counter.support, true),
      text("p", counter.reason),
    );
    counters.append(counterRow);
  }
  body.append(counters);
  toggle.onclick = () => {
    const open = !body.hidden;
    body.hidden = open;
    toggle.setAttribute("aria-expanded", String(!open));
    toggle.setAttribute("aria-label", `${pairName} 상세 설명 ${open ? "펼치기" : "접기"}`);
    toggle.textContent = open ? "＋ 설명 펼치기" : "− 설명 접기";
    card.classList.toggle("is-open", !open);
  };
  card.append(head, body);
  return card;
}
const botDuoViews = [
  {
    id: "tier",
    label: "등급별 보기",
    groupLabel: (duo) => `${duo.tier} 등급`,
  },
  {
    id: "adc",
    label: "원딜 챔피언 기준",
    groupLabel: (duo) => `원딜 · ${championById(duo.adc)?.name || duo.adc}`,
  },
  {
    id: "support",
    label: "서폿 챔피언 기준",
    groupLabel: (duo) => `서폿 · ${championById(duo.support)?.name || duo.support}`,
  },
];
const botDuoTierRank = { "S+": 0, S: 1, A: 2, B: 3, C: 4 };
function botDuoCompare(a, b) {
  const byTier =
    (botDuoTierRank[a.tier] ?? 9) - (botDuoTierRank[b.tier] ?? 9) ||
    (b.score ?? 0) - (a.score ?? 0) ||
    (b.games ?? 0) - (a.games ?? 0) ||
    String(a.id).localeCompare(String(b.id));
  if (botDuoView === "tier") return byTier;
  const aEntry = championById(botDuoView === "adc" ? a.adc : a.support);
  const bEntry = championById(botDuoView === "adc" ? b.adc : b.support);
  return (
    String(aEntry?.name || (botDuoView === "adc" ? a.adc : a.support)).localeCompare(
      String(bEntry?.name || (botDuoView === "adc" ? b.adc : b.support)),
    ) || byTier
  );
}
function renderBotDuos(q) {
  const list = (botDuoData.duos || []).filter((duo) =>
    q
      .split(/\s+/)
      .filter(Boolean)
      .map(norm)
      .every((term) =>
        norm(
          [
            duo.id,
            duo.adc,
            championById(duo.adc)?.name,
            duo.support,
            championById(duo.support)?.name,
            ...(duo.tags || []),
            duo.summary,
            duo.plan,
            ...(duo.why || []),
            ...(duo.counters || []).flatMap((counter) => [
              counter.adc,
              championById(counter.adc)?.name,
              counter.support,
              championById(counter.support)?.name,
              counter.reason,
            ]),
          ].join(" "),
        ).includes(term),
      ),
  );
  list.sort(botDuoCompare);
  const activeView =
    botDuoViews.find((view) => view.id === botDuoView) || botDuoViews[0];
  const gameLabel = botDuoData.proGames
    ? `${botDuoData.proGames.toLocaleString("ko-KR")}경기 프로 기록`
    : "공개 통계";
  $("#count").textContent = `${list.length}개 프로 조합 · ${activeView.label} · ${gameLabel} · ${botDuoData.proPatchRange || botDuoData.patch || patch} 기준`;
  $("#grid").replaceChildren();
  const intro = text("div", "", "duo-intro");
  intro.append(
    text("p", "2026 시즌 공개 프로 대회에서 실제로 나온 봇·서포터 조합을 모았어요."),
    text(
      "p",
      botDuoData.methodology || "통계와 스킬 궁합을 함께 살펴 초보자용으로 정리했어요.",
    ),
  );
  if (botDuoData.tierCounts) {
    const tierText = ["S+", "S", "A", "B", "C"]
      .filter((tier) => botDuoData.tierCounts[tier] != null)
      .map((tier) => `${tier} ${botDuoData.tierCounts[tier]}개`)
      .join(" · ");
    intro.append(
      text(
        "p",
        `티어 분포 · ${tierText} · 경기 수가 적은 조합은 상위 티어로 올라가지 않도록 보정했어요.`,
        "duo-tier-summary",
      ),
    );
  }
  $("#grid").append(intro);
  const viewTabs = text("div", "", "duo-view-tabs");
  viewTabs.setAttribute("role", "group");
  viewTabs.setAttribute("aria-label", "봇 듀오 보기 방식");
  for (const view of botDuoViews) {
    const button = text("button", view.label);
    button.type = "button";
    button.setAttribute("aria-pressed", String(view.id === botDuoView));
    button.onclick = () => {
      botDuoView = view.id;
      render();
    };
    viewTabs.append(button);
  }
  $("#grid").append(viewTabs);
  const groups = [];
  const groupMap = new Map();
  for (const duo of list) {
    const key =
      botDuoView === "tier"
        ? duo.tier
        : botDuoView === "adc"
          ? duo.adc
          : duo.support;
    let group = groupMap.get(key);
    if (!group) {
      group = { key, label: activeView.groupLabel(duo), duos: [] };
      groupMap.set(key, group);
      groups.push(group);
    }
    group.duos.push(duo);
  }
  for (const group of groups) {
    const section = text("section", "", "duo-group");
    const heading = text("h3", "", "duo-group-title");
    const groupId = `duo-group-${String(botDuoView)}-${String(group.key).replace(/[^a-z0-9_-]/gi, "-")}`;
    const cards = text("div", "", "duo-group-cards");
    cards.id = `${groupId}-cards`;
    cards.hidden = true;
    const groupToggle = text("button", "＋ 조합 펼치기", "duo-group-toggle");
    groupToggle.type = "button";
    groupToggle.setAttribute("aria-expanded", "false");
    groupToggle.setAttribute("aria-controls", cards.id);
    groupToggle.setAttribute("aria-label", `${group.label} 조합 펼치기`);
    groupToggle.onclick = () => {
      const open = !cards.hidden;
      cards.hidden = open;
      groupToggle.textContent = open ? "＋ 조합 펼치기" : "− 조합 접기";
      groupToggle.setAttribute("aria-expanded", String(!open));
      groupToggle.setAttribute("aria-label", `${group.label} 조합 ${open ? "펼치기" : "접기"}`);
      section.classList.toggle("is-open", !open);
    };
    heading.append(
      text("span", group.label),
      text("small", `${group.duos.length}개 조합`),
      groupToggle,
    );
    for (const duo of group.duos) cards.append(botDuoCard(duo));
    section.append(heading, cards);
    $("#grid").append(section);
  }
  if (!list.length)
    $("#grid").append(
      text("p", "찾는 조합이 없어요. 챔피언 이름이나 역할을 다시 검색해 보세요.", "empty"),
    );
  const note = text("div", "", "duo-source-note");
  note.append(
    text("p", botDuoData.notice || "조합 통계는 패치와 티어에 따라 달라질 수 있어요."),
  );
  const sources = text("p", "자료 출처 · ");
  for (const [index, source] of (botDuoData.sources || []).entries()) {
    if (index) sources.append(document.createTextNode(" · "));
    const link = text("a", source.label + " ↗");
    link.href = source.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    sources.append(link);
  }
  note.append(sources);
  $("#grid").append(note);
}
function easterEggCard(egg) {
  const card = text("article", "", "easter-card");
  const head = text("div", "", "easter-card-top");
  const title = text("div", "", "easter-card-heading");
  title.append(
    text("span", egg.category || "숨은 이야기", "badge easter-category"),
    text("h3", egg.title),
  );
  head.append(title);
  if (egg.status) head.append(text("span", egg.status, "easter-status"));
  card.append(head, text("p", egg.summary, "easter-summary"));

  const relatedIds = Array.isArray(egg.relatedChampions)
    ? egg.relatedChampions
    : [];
  if (relatedIds.length) {
    const related = text("div", "", "easter-related");
    related.append(text("span", "관련 챔피언", "easter-related-label"));
    const chips = text("div", "", "easter-related-chips");
    for (const id of relatedIds) {
      const champion = championById(id);
      if (!champion) continue;
      const chip = text("button", "", "easter-champion");
      chip.type = "button";
      chip.title = `${champion.name} 설명 보기`;
      chip.append(portrait(champion), text("span", champion.name));
      chip.onclick = () => {
        lastFocus = chip;
        location.hash = `champion/${champion.id}`;
      };
      chips.append(chip);
    }
    if (chips.childElementCount) {
      related.append(chips);
      card.append(related);
    }
  }

  const details = document.createElement("details");
  details.className = "easter-details";
  details.append(text("summary", "발동 조건과 결과 보기"));
  const detailFields = [
    ["언제 나타나요?", egg.trigger],
    ["무슨 일이 생기나요?", egg.effect],
    ["초보자 메모", egg.tip],
  ];
  for (const [label, value] of detailFields) {
    if (!value) continue;
    const block = text("div", "", "easter-detail-block");
    block.append(text("h4", label), text("p", value));
    details.append(block);
  }
  card.append(details);

  if (egg.sourceUrl) {
    const source = text("p", "", "easter-source");
    source.append(text("span", "자료 출처 · "));
    const link = text("a", `${egg.sourceLabel || "출처"} ↗`);
    link.href = egg.sourceUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    source.append(link);
    card.append(source);
  }
  return card;
}
function renderEasterEggs(q) {
  const query = norm(q || "");
  const list = (easterEggData.eggs || [])
    .filter((egg) => {
      if (!query) return true;
      const relatedNames = (egg.relatedChampions || [])
        .map((id) => championById(id)?.name || id)
        .join(" ");
      return norm(
        [
          egg.category,
          egg.title,
          egg.status,
          egg.difficulty,
          egg.summary,
          egg.trigger,
          egg.effect,
          egg.tip,
          ...(egg.tags || []),
          relatedNames,
        ].join(" "),
      ).includes(query);
    })
    .sort(
      (a, b) =>
        String(a.category || "").localeCompare(String(b.category || ""), "ko") ||
        String(a.title || "").localeCompare(String(b.title || ""), "ko"),
    );
  $("#count").textContent = `${list.length}개 숨은 이야기`;
  $("#grid").replaceChildren();
  const intro = text("div", "", "easter-intro");
  intro.append(
    text("p", "게임 속에 살짝 숨겨진 상호작용과 재미있는 장면을 모았어요."),
    text(
      "p",
      easterEggData.notice ||
        "패치와 게임 모드에 따라 달라질 수 있으니 재미있는 참고용으로 봐주세요.",
    ),
  );
  $("#grid").append(intro);
  for (const egg of list) $("#grid").append(easterEggCard(egg));
  if (!list.length)
    $("#grid").append(
      text("p", "찾는 이스터 에그가 없어요. 챔피언이나 조건을 다시 검색해 보세요.", "empty"),
    );
  const note = text("div", "", "easter-source-note");
  note.append(text("p", "출처와 확인 조건을 함께 적어 두었어요. 오래된 연출은 상태를 따로 표시했어요."));
  const sources = text("p", "참고 자료 · ");
  for (const [index, source] of (easterEggData.sources || []).entries()) {
    if (index) sources.append(document.createTextNode(" · "));
    const link = text("a", `${source.label} ↗`);
    link.href = source.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    sources.append(link);
  }
  note.append(sources);
  $("#grid").append(note);
}
function timelineChampionButton(id) {
  const champion = championById(id);
  if (!champion) return null;
  const button = text("button", "", "timeline-champion");
  button.type = "button";
  button.title = `${champion.name} 챔피언 설명 보기`;
  button.setAttribute("aria-label", `${champion.name} 챔피언 설명 보기`);
  const icon = portrait(champion);
  icon.alt = champion.name;
  button.append(icon, text("span", champion.name));
  button.onclick = () => {
    lastFocus = button;
    location.hash = `champion/${champion.id}`;
  };
  return button;
}
function renderRegionTimeline() {
  const allEvents = [...(regionTimeline.events || [])].sort(
    (a, b) => Number(a.order || 0) - Number(b.order || 0),
  );
  const events = allEvents.filter(
    (event) => timelineRegion === "전체" || event.regions?.includes(timelineRegion),
  );
  $("#count").textContent = `${events.length}개 사건 · 시간순`;
  $("#grid").replaceChildren();
  const wrap = text("div", "", "region-timeline");
  const back = text("button", "← 지역 목록으로", "region-back");
  back.type = "button";
  back.onclick = () => {
    showTimeline = false;
    timelineRegion = "전체";
    selectedRegion = null;
    render();
  };
  const head = text("div", "", "region-timeline-head");
  head.append(
    text("p", "룬테라 전체 이야기", "region-eyebrow"),
    text("h2", "룬테라 연대기", "region-title"),
    text(
      "p",
      regionTimeline.notice || "공개된 설정을 바탕으로 큰 사건을 시간순으로 정리했어요.",
      "region-timeline-notice",
    ),
  );
  const filterLabel = text("p", "지역으로 좁혀 보기", "timeline-filter-label");
  const filters = text("div", "", "timeline-filter");
  const availableRegions = REGIONS.filter((region) =>
    allEvents.some((event) => event.regions?.includes(region)),
  );
  for (const region of ["전체", ...availableRegions]) {
    const button = text("button", region, "timeline-filter-button");
    button.type = "button";
    button.setAttribute("aria-pressed", String(region === timelineRegion));
    button.onclick = () => {
      timelineRegion = region;
      renderRegionTimeline();
    };
    filters.append(button);
  }
  const list = text("div", "", "timeline-list");
  for (const event of events) {
    const article = text("article", "", "timeline-event");
    const meta = text("div", "", "timeline-event-meta");
    meta.append(text("span", event.period || event.era || "이야기", "timeline-period"));
    if (event.confidence) meta.append(text("span", event.confidence, "timeline-confidence"));
    const title = text("h3", event.title || "이름 없는 사건");
    const summary = text("p", event.summary || "");
    article.append(meta, title, summary);
    if (event.detail) article.append(text("p", event.detail, "timeline-detail"));
    if (event.regions?.length) {
      const regions = text("div", "", "timeline-regions");
      for (const region of event.regions) regions.append(text("span", region, "timeline-region-chip"));
      article.append(regions);
    }
    const champions = (event.champions || [])
      .map((id) => timelineChampionButton(id))
      .filter(Boolean);
    if (champions.length) {
      const cast = text("div", "", "timeline-champions");
      cast.append(text("span", "관련 챔피언", "timeline-cast-label"), ...champions);
      article.append(cast);
    }
    list.append(article);
  }
  if (!events.length)
    list.append(text("p", "이 지역의 연대기 자료를 준비 중이에요.", "empty"));
  const sourceNote = text("div", "", "timeline-source-note");
  sourceNote.append(text("p", "연대기 출처 · "));
  for (const [index, source] of (regionTimeline.sources || []).entries()) {
    if (index) sourceNote.lastChild.append(document.createTextNode(" · "));
    const link = text("a", `${source.label} ↗`);
    link.href = source.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    sourceNote.lastChild.append(link);
  }
  wrap.append(back, head, filterLabel, filters, list, sourceNote);
  $("#grid").append(wrap);
}
function render() {
  roleFilters();
  const q =
    kind === "botduos"
      ? $("#search").value.normalize("NFKC").toLowerCase()
      : norm($("#search").value);
  $("#initials").hidden = kind !== "champion";
  $("#glossary-help").hidden = kind !== "glossary";
  document
    .querySelectorAll(".easy-filter")
    .forEach((el) => (el.hidden = kind !== "champion" && kind !== "item"));
  $(".search-row").hidden = kind === "regions";
  document.querySelectorAll("[data-initial]").forEach((b) => {
    b.setAttribute("aria-pressed", b.dataset.initial === selectedInitial);
  });
  if (kind === "botduos") {
    renderBotDuos(q);
    return;
  }
  if (kind === "runes") {
    renderRunes(q);
    return;
  }
  if (kind === "easter") {
    renderEasterEggs(q);
    return;
  }
  if (kind === "regions") {
    $("#grid").replaceChildren();
    if (showTimeline) {
      renderRegionTimeline();
      return;
    }
    if (!selectedRegion) {
      $("#count").textContent = `${REGIONS.length}개 지역`;
      const picker = text("div", "", "region-picker");
      const timelineLaunch = text("button", "", "region-timeline-launch");
      timelineLaunch.type = "button";
      timelineLaunch.append(
        text("span", "시간순으로 읽기", "timeline-launch-kicker"),
        text("strong", "룬테라 연대기"),
        text("span", "지역별 이야기를 하나의 흐름으로 이어 봐요 →", "subtitle"),
      );
      timelineLaunch.onclick = () => {
        showTimeline = true;
        timelineRegion = "전체";
        render();
      };
      picker.append(timelineLaunch);
      for (const region of REGIONS) {
        const count = entries.filter(
          (e) => e.kind === "champion" && e.regions?.includes(region),
        ).length;
        if (!count) continue;
        const b = text("button", "", "region-card");
        b.type = "button";
        b.append(
          text("h3", region),
          text("span", `챔피언 ${count}명`, "subtitle"),
        );
        b.onclick = () => {
          showTimeline = false;
          selectedRegion = region;
          render();
        };
        picker.append(b);
      }
      $("#grid").append(picker);
      return;
    }
    const champs = entries
      .filter(
        (e) => e.kind === "champion" && e.regions?.includes(selectedRegion),
      )
      .sort(byName);
    const chapter = regionStories[selectedRegion];
    $("#count").textContent = chapter
      ? `${champs.length}명이 등장하는 이야기`
      : `${champs.length}명의 이야기`;
    const story = text("div", "", "region-story");
    const back = text("button", "← 지역 목록으로", "region-back");
    back.type = "button";
    back.onclick = () => {
      showTimeline = false;
      selectedRegion = null;
      render();
    };
    story.append(back);
    if (chapter) {
      story.append(
        text("p", selectedRegion, "region-eyebrow"),
        text("h2", chapter.title, "region-title"),
      );
      const novel = text("div", "", "region-novel");
      for (const para of chapter.text.split("\n\n")) novel.append(text("p", para));
      story.append(novel);
      if (champs.length) {
        const castHead = text("h3", "이 이야기에 등장한 챔피언", "region-cast-head");
        const cast = text("div", "", "region-cast");
        for (const e of champs) {
          const b = text("button", "", "region-cast-card");
          b.type = "button";
          b.title = e.name;
          b.append(portrait(e), text("span", e.name));
          b.onclick = () => {
            lastFocus = b;
            location.hash = `champion/${e.id}`;
          };
          cast.append(b);
        }
        story.append(castHead, cast);
      }
    } else {
      story.append(text("h2", selectedRegion + " 이야기", "region-title"));
      for (const e of champs) {
        if (!e.lore) continue;
        const ch = text("article", "", "region-chapter");
        const head = text("div", "", "region-chapter-head");
        head.append(portrait(e), text("h3", e.name));
        ch.append(head);
        for (const para of e.lore.text.split("\n\n")) ch.append(text("p", para));
        story.append(ch);
      }
      if (!champs.some((e) => e.lore))
        story.append(text("p", "아직 이 지역의 이야기가 준비되지 않았어요.", "empty"));
    }
    $("#grid").append(story);
    return;
  }
  if (kind === "glossary") {
    const list = glossaryEntries
      .filter((e) =>
        norm([e.name, ...e.aliases, e.meaning].join(" ")).includes(q),
      )
      .sort(byName);
    $("#count").textContent = `${list.length}개 용어`;
    $("#grid").replaceChildren();
    for (const e of list) {
      const card = text("article", "", "card term-card");
      card.append(
        text("span", e.category, "badge"),
        text("h3", e.name),
        text("span", e.aliases.join(" · "), "subtitle"),
        text("p", e.meaning),
        text("p", e.example, "term-example"),
      );
      $("#grid").append(card);
    }
    if (!list.length)
      $("#grid").append(
        text(
          "p",
          "찾는 용어가 없어요. 다른 말이나 줄임말로 검색해 보세요.",
          "empty",
        ),
      );
    scheduleCardAlignment();
    return;
  }
  if (kind === "favorite") {
    const list = entries
      .filter(
        (e) =>
          (e.kind === "champion" || e.kind === "item") &&
          isFav(e) &&
          norm(e.name + e.id).includes(q),
      )
      .sort(
        (a, b) =>
          (a.kind === b.kind ? 0 : a.kind === "champion" ? -1 : 1) ||
          a.name.localeCompare(b.name, "ko"),
      );
    $("#count").textContent = `즐겨찾기 ${list.length}개`;
    $("#grid").replaceChildren();
    for (const e of list) $("#grid").append(cardEl(e));
    if (!list.length) {
      const empty = text("div", "", "empty");
      empty.append(
        text(
          "p",
          q
            ? "즐겨찾기 중에는 찾는 이름이 없어요."
            : "아직 즐겨찾기한 게 없어요. 카드의 ☆를 눌러 내가 쓰는 챔피언·아이템을 모아보세요.",
        ),
      );
      const go = text("button", "챔피언 보러 가기");
      go.onclick = () => $('[data-kind="champion"]').click();
      empty.append(go);
      $("#grid").append(empty);
    }
    scheduleCardAlignment();
    return;
  }
  const list = entries.filter(
    (e) =>
      e.kind === kind &&
      (selectedRole === "전체" || e.roles?.includes(selectedRole)) &&
      (kind !== "champion" ||
        selectedInitial === "전체" ||
        initial(e.name) === selectedInitial) &&
      (!$("#easy-only").checked || e.summary) &&
      norm(e.name + e.id).includes(q),
  );
  list.sort(
    (a, b) =>
      (kind === "item" ? a.gold - b.gold : 0) || a.name.localeCompare(b.name, "ko"),
  );
  $("#count").textContent =
    `${list.length}개 · 쉬운 설명 ${list.filter((e) => e.summary).length}개`;
  $("#grid").replaceChildren();
  for (const e of list) $("#grid").append(cardEl(e));
  if (!list.length) {
    const empty = text("div", "", "empty");
    empty.append(text("p", "찾는 이름이 없어요. 다른 이름으로 찾아볼까요?"));
    const reset = text("button", "검색 초기화");
    reset.onclick = () => {
      $("#search").value = "";
      $("#easy-only").checked = false;
      selectedInitial = "전체";
      selectedRole = "전체";
      render();
      $("#search").focus();
    };
    empty.append(reset);
    $("#grid").append(empty);
  }
  scheduleCardAlignment();
}
function openRuneDetail(pathKey, runeKey) {
  const match = runeByKey(pathKey, runeKey);
  if (!match) {
    if ($("#detail").open) $("#detail").close();
    return;
  }
  const { path, slot, slotIndex, rune } = match;
  const content = $("#detail-content");
  content.replaceChildren();
  const head = text("div", "", "detail-head rune-detail-head");
  const profile = text("div", "", "detail-profile");
  profile.append(runePortrait(rune, "detail-rune-icon"));
  const title = text("div", "");
  title.append(
    text("span", `특성 · ${path.name}`),
    text("h2", rune.name),
    text("span", `${slot.label} · ${path.subtitle}`),
  );
  head.append(profile, title);
  content.append(head, text("p", runeText(runeEasySummary(rune)), "summary"));

  const pathBlock = text("section", "", "detail-block rune-detail-path");
  pathBlock.append(
    text("h3", `${path.name} 마스터리`),
    text("p", path.easy),
  );
  content.append(pathBlock);

  const tipBlock = text("section", "", "detail-block");
  tipBlock.append(text("h3", "이렇게 골라 보세요"), text("p", runePickTip(path, slotIndex)));
  content.append(tipBlock);

  const details = document.createElement("details");
  details.className = "rune-original";
  details.append(
    text("summary", "공식 특성 설명"),
    text("p", runeText(rune.detail)),
  );
  content.append(details);

  const source = text("div", "", "source");
  source.append(text("p", `Riot Games Data Dragon 공식 데이터 · 설명 기준 ${runesData.patch || patch}`));
  const link = text("a", "특성 원문 데이터 보기 ↗");
  link.href = runesData.sourceUrl;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  source.append(link);
  content.append(source);
  if (!$("#detail").open) $("#detail").showModal();
  content.scrollTop = 0;
}
function openDetail() {
  const [type, id, extra] = location.hash.slice(1).split("/");
  if (type === "rune") {
    openRuneDetail(id, extra);
    return;
  }
  const e = entries.find((e) => e.kind === type && e.id === id);
  if (!e) {
    if ($("#detail").open) $("#detail").close();
    return;
  }
  const content = $("#detail-content");
  content.replaceChildren();
  const head = text("div", "", "detail-head");
  const title = text("div", "");
  title.append(
    text("span", e.kind === "champion" ? "함께할 친구" : "든든한 준비물"),
  );
  const h = text("h2", e.name);
  h.id = "detail-name";
  title.append(h, text("span", e.subtitle));
  const profile = text("div", "", "detail-profile");
  profile.append(portrait(e));
  if (e.kind === "champion" && e.skills?.length) {
    const shortcuts = text("div", "", "skill-shortcuts");
    for (const skill of e.skills) {
      const shortcut = text("button", "", "skill-shortcut");
      shortcut.type = "button";
      shortcut.title = `${skill.key} · ${skill.name} 설명으로 이동`;
      shortcut.setAttribute("aria-label", `${skill.key} ${skill.name} 설명으로 이동`);
      shortcut.setAttribute("aria-controls", `detail-skill-${skill.key.toLowerCase()}`);
      const icon = portrait(skill);
      icon.className = "skill-shortcut-icon";
      icon.alt = `${skill.key} ${skill.name}`;
      shortcut.append(icon, text("span", skill.key, "skill-shortcut-key"));
      shortcut.onclick = () => {
        const target = document.getElementById(
          `detail-skill-${skill.key.toLowerCase()}`,
        );
        if (!target) return;
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        target.focus({ preventScroll: true });
      };
      shortcuts.append(shortcut);
    }
    profile.append(shortcuts);
  }
  head.append(profile, title);
  content.append(
    head,
    text("p", e.summary || "쉬운 설명을 준비하고 있어요.", "summary"),
  );
  for (const [label, value] of [
    ["쉽게 말하면", e.analogy],
    ["이렇게 써보세요", e.tip],
    ["이것만 기억해요", e.caution],
  ]) {
    if (value) {
      const block = text("section", "", "detail-block");
      block.append(text("h3", label), text("p", value));
      content.append(block);
    }
  }
  const counters = championCounterSection(e);
  if (counters) content.append(counters);
  const arenaAugments = arenaAugmentSection(e);
  if (arenaAugments) content.append(arenaAugments);
  if (e.gold !== undefined)
    content.append(
      text("p", `상점 가격 · ${e.gold.toLocaleString("ko-KR")} 골드`, "price"),
    );
  if (e.kind === "item" && e.roles) {
    const usage = text("section", "", "detail-block item-usage");
    usage.append(
      text("h3", "이 아이템은 누구에게 도움이 될까?"),
      text("p", e.roles.join(" · "), "role-label"),
    );
    const meanings = {
      AD: "AD · 기본 공격과 일부 스킬에 쓰는 공격력",
      AP: "AP · 일부 스킬을 키우는 주문력",
      브루저: "브루저 · 공격력과 맷집을 함께 갖춘 근접 전투형",
      탱커: "탱커 · 공격을 버티는 데 도움",
      서포터: "서포터 · 우리 편을 돕거나 주변을 확인",
      공용: "공용 · 여러 역할이 함께 사용",
    };
    for (const role of e.roles)
      usage.append(text("p", meanings[role], "role-meaning"));
    for (const use of e.uses) usage.append(text("p", use, "item-use"));
    usage.append(
      text(
        "small",
        "공식 능력치·효과로 분류했어요. 전용 아이템이라는 뜻은 아니에요. AD/AP는 능력치이고 물리/마법 피해와 같은 뜻은 아니에요.",
      ),
    );
    content.append(usage);
  }
  if (e.kind === "item") {
    const components = (e.from || []).map(itemById).filter(Boolean);
    const upgrades = [...new Set((e.into || []).map(String))]
      .map(itemById)
      .filter(Boolean);
    const section = text("section", "", "detail-block recipes");
    section.append(text("h3", "아이템 조합"));
    section.append(
      text(
        "p",
        "재료를 모아 이 아이템을 만들거나, 이 아이템으로 더 좋은 아이템을 만들 수 있어요.",
        "cc-condition",
      ),
    );
    const fromGroup = text("div", "", "recipe-group");
    fromGroup.append(text("h4", "이 아이템을 만들려면"));
    if (components.length) {
      fromGroup.append(recipeFlow(e, components));
    } else {
      fromGroup.append(
        text(
          "p",
          e.depth && e.depth > 1
            ? "현재 확인된 하위 재료가 없어요. 상점에서 바로 살 수 있는 아이템일 수 있어요."
            : "더 작은 재료 없이 상점에서 바로 살 수 있는 기본 아이템이에요.",
          "recipe-empty",
        ),
      );
    }
    section.append(fromGroup);
    const intoGroup = text("div", "", "recipe-group");
    intoGroup.append(text("h4", "이 아이템으로 만들 수 있는 상위 아이템"));
    if (upgrades.length) {
      const branches = text("div", "", "recipe-branches");
      for (const upgrade of upgrades) branches.append(recipeFlow(e, upgrade, "backward"));
      intoGroup.append(branches);
    } else {
      intoGroup.append(
        text("p", "이 아이템으로 더 만들 수 있는 상위 아이템이 없어요.", "recipe-empty"),
      );
    }
    section.append(intoGroup);
    section.append(text("small", "아이콘을 누르면 해당 아이템 상세 설명으로 이동해요. 조합 정보는 Data Dragon 공식 데이터 기준이에요.", "recipe-note"));
    content.append(section);
  }
  if (e.skills?.length) {
    const section = text("section", "", "skills");
    section.append(text("h3", "Q · W · E · R, 하나씩 알아보기"));
    section.append(
      text(
        "p",
        "키를 누르면 쓰는 기술이에요. R은 보통 6레벨부터 배우는 큰 기술이에요. 변신하는 챔피언은 다를 수 있어요.",
        "skills-help",
      ),
    );
    for (const skill of e.skills) {
      const block = text("article", "", "skill");
      block.id = `detail-skill-${skill.key.toLowerCase()}`;
      block.tabIndex = -1;
      const heading = text("h4", "");
      const icon = portrait(skill);
      icon.className = "skill-icon";
      heading.append(icon, text("kbd", skill.key), text("span", skill.name));
      block.append(
        heading,
        text("p", skill.easy),
        text(
          "small",
          skill.edited ? "쉽게 풀어쓴 편집 설명" : "공식 설명 · 표현 정리",
        ),
      );
      if (skill.glossary.length) {
        const glossary = document.createElement("details");
        glossary.append(text("summary", "어려운 말 풀이"));
        for (const [term, meaning] of skill.glossary) {
          const line = text("p", "");
          line.append(
            text("strong", term + " — "),
            document.createTextNode(meaning),
          );
          glossary.append(line);
        }
        block.append(glossary);
      }
      const raw = document.createElement("details");
      raw.append(text("summary", "공식 스킬 설명"), text("p", skill.original));
      block.append(raw);
      const advanced = skill.advanced;
      if (advanced) {
        if (advanced.cc.length) {
          const cc = text("div", "", "cc-effects");
          cc.append(text("h5", "맞히면 생기는 방해 효과 · CC"));
          for (const effect of advanced.cc) {
            cc.append(
              text("span", effect.name, "cc-badge"),
              text("p", effect.meaning),
              text("p", effect.condition, "cc-condition"),
            );
          }
          block.append(cc);
        }
        const more = document.createElement("details");
        more.className = "advanced";
        more.append(text("summary", "자세히 보기 · 계수·사거리·재사용 대기시간"));
        more.append(
          text(
            "p",
            "AD는 공격력, AP는 주문력이에요. 60% AP는 주문력 100당 해당 효과가 60 늘어난다는 뜻이에요. 피해 종류(물리·마법)와 계수는 별개예요.",
          ),
        );
        if (skill.rangeBurn || skill.cooldownBurn) {
          const specs = text("p", "", "skill-specs");
          if (skill.rangeBurn)
            specs.append(text("span", `사거리 ${skill.rangeBurn}`, "spec"));
          if (skill.cooldownBurn)
            specs.append(
              text("span", `재사용 대기시간 ${skill.cooldownBurn}초`, "spec"),
            );
          if (skill.costBurn && skill.costType && skill.costType !== "소모값 없음")
            specs.append(
              text("span", `${skill.costType} ${skill.costBurn}`, "spec"),
            );
          more.append(specs);
        }
        if (advanced.formVariant) {
          more.append(
            text(
              "p",
              `이 스킬은 형태·강화·재사용 조건에 따라 효과가 달라져요${skill.name.includes(" / ") ? ` (${skill.name})` : ""}. 위 계수는 일부 조건만 확인된 값일 수 있으니, 위 쉬운 설명과 공식 설명에서 조건을 함께 확인하세요.`,
              "cc-condition",
            ),
          );
        }
        if (advanced.formulas.length) {
          for (const formula of advanced.formulas) {
            const formulaText = formula.parts
              .map((p) =>
                p.stat
                  ? `${p.values.map((v) => Number((v * 100).toFixed(2))).join(" / ")}% ${p.stat}`
                  : p.values.join(" / "),
              )
              .join(" + ");
            more.append(
              text("h5", formula.label + " 계산"),
              text("p", formulaText, "formula"),
            );
          }
        } else
          more.append(
            text(
              "p",
              "이 스킬의 AD/AP 계수는 아직 확인이 필요해요. 표시되지 않았다고 계수가 0인 것은 아니에요.",
            ),
          );
        more.append(
          text(
            "p",
            "숫자 / 숫자는 스킬 레벨 순서예요. 확인 가능한 계산식만 표시했어요. 여러 번 맞히기·반환·변신·대상별 보정은 원문 조건을 함께 확인하세요.",
            "cc-condition",
          ),
        );
        const source = text("a", `계수 근거 · 게임 데이터 ${patch} ↗`);
        source.href = advanced.sourceUrl;
        source.target = "_blank";
        source.rel = "noopener noreferrer";
        more.append(source);
        block.append(more);
      }
      section.append(block);
    }
    if (e.passive) {
      const passive = document.createElement("details");
      passive.className = "skill";
      const passiveHeading = text(
        "summary",
        "자동으로 발동하는 효과 · " + e.passive.name,
      );
      const passiveIcon = portrait(e.passive);
      passiveIcon.className = "skill-icon";
      passiveHeading.prepend(passiveIcon);
      passive.append(passiveHeading, text("p", e.passive.original));
      section.append(passive);
    }
    content.append(section);
  }
  if (e.builds) {
    const modeLabels = { rift: "소환사의 협곡", aram: "칼바람 나락" };
    const rowLabels = {
      start: "시작 아이템",
      boots: "신발",
      core: "핵심 아이템",
      situational: "상황에 따라",
    };
    const section = text("section", "", "detail-block builds");
    section.append(text("h3", "추천 아이템 빌드"));
    section.append(
      text(
        "p",
        "다른 사람들이 많이 쓰는 아이템이에요. op.gg 기록을 바탕으로 해요.",
        "cc-condition",
      ),
    );
    for (const [mode, rows] of Object.entries(e.builds)) {
      const modeBlock = text("div", "", "build-mode");
      modeBlock.append(text("h4", modeLabels[mode] || mode));
      for (const [key, list] of Object.entries(rows)) {
        if (!list.length) continue;
        const row = text("div", "", "build-row");
        row.append(text("span", rowLabels[key] || key, "build-row-label"));
        const icons = text("div", "", "build-icons");
        for (const it of list) {
          const icon = portrait(it);
          icon.className = "build-icon";
          icon.title = it.name;
          icon.alt = it.name;
          icons.append(icon);
        }
        row.append(icons);
        modeBlock.append(row);
      }
      section.append(modeBlock);
    }
    content.append(section);
  }
  if (e.kind === "champion" && e.lore) {
    const section = text("section", "", "detail-block lore");
    section.append(text("h3", "이 친구의 이야기"));
    const lore = loreRelations(e.lore.text, e.id);
    if (lore.related.length) {
      const relations = text("div", "", "lore-relations");
      relations.append(text("h4", "챔피언 관계"));
      const legend = text("div", "", "relation-legend");
      for (const [type, meta] of Object.entries(relationMeta)) {
        const item = text("span", "", `relation-legend-item relation-${type}`);
        item.append(text("b", meta.label), text("span", meta.description));
        legend.append(item);
      }
      relations.append(legend);
      const diagram = text("div", "", "relation-diagram");
      const center = text("div", "", "relation-diagram-center");
      const centerCard = text("div", "", "relation-center-card");
      const centerIcon = portrait(e);
      centerIcon.alt = e.name;
      centerCard.append(centerIcon, text("span", e.name));
      center.append(centerCard);
      diagram.append(center, text("div", "", "relation-connector"));
      const relationGrid = text("div", "", "relation-grid");
      for (const related of lore.related) {
        const relation = text("button", "", `relation-card relation-${related.type}`);
        relation.type = "button";
        relation.title = `${related.entry.name} · ${related.label} 관계 · 상세 설명 보기`;
        relation.setAttribute(
          "aria-label",
          `${related.entry.name} · ${related.label} 관계 · 상세 설명 보기`,
        );
        const icon = portrait(related.entry);
        icon.alt = related.entry.name;
        const copy = text("span", "", "relation-card-copy");
        copy.append(
          text("span", related.entry.name, "relation-name"),
          text("span", related.label, "relation-kind"),
        );
        relation.append(icon, copy);
        relation.onclick = () => {
          lastFocus = relation;
          location.hash = `champion/${related.entry.id}`;
        };
        relationGrid.append(relation);
      }
      diagram.append(relationGrid);
      relations.append(diagram);
      section.append(relations);
    }
    for (const para of lore.paragraphs)
      section.append(text("p", para));
    const link = text("a", "나무위키에서 전체 보기 ↗");
    link.href = e.lore.sourceUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    section.append(link);
    if (e.regions?.length)
      section.append(
        text("p", "소속 지역 · " + e.regions.join(", "), "lore-regions"),
      );
    content.append(section);
  }
  const source = text("div", "", "source");
  source.append(
    text(
      "p",
      e.summary
        ? `${e.reviewed === true ? "자료 검수 완료" : "편집 예시 · 검수 전"} · 설명 기준 ${e.patch || patch}`
        : "Data Dragon 공식 원문 · 쉬운 설명 준비 중",
    ),
  );
  const details = document.createElement("details");
  details.open = !e.summary;
  details.append(
    text(
      "summary",
      e.kind === "champion"
        ? "공식 배경 이야기와 출처 보기"
        : "공식 아이템 설명과 출처 보기",
    ),
    text("p", e.original, "original"),
  );
  const link = text("a", "공식 데이터 원문 ↗");
  link.href = e.sourceUrl;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  details.append(link);
  source.append(details);
  if (e.reviewed === true && e.explanationSourceUrl) {
    const citation = text("a", "설명 출처: " + e.sourceTitle);
    citation.href = e.explanationSourceUrl;
    citation.target = "_blank";
    citation.rel = "noopener noreferrer";
    source.append(citation);
  }
  content.append(source);
  if (!$("#detail").open) $("#detail").showModal();
  content.scrollTop = 0;
}
function close() {
  history.replaceState(null, "", location.pathname + location.search);
  $("#detail").close();
  if (lastFocus?.isConnected) lastFocus.focus();
}
$("#close").onclick = close;
$("#detail").addEventListener("cancel", (e) => {
  e.preventDefault();
  close();
});
$("#detail").addEventListener("click", (e) => {
  if (e.target === $("#detail")) {
    const r = e.target.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      close();
  }
});
window.addEventListener("hashchange", syncRoute);
$("#search").addEventListener("input", render);
$("#easy-only").addEventListener("change", render);
const KIND_TITLE = {
  favorite: "내 즐겨찾기",
  champion: "챔피언 둘러보기",
  item: "아이템 둘러보기",
  runes: "특성 둘러보기",
  glossary: "게임 속 말, 쉽게 알아보기",
  regions: "지역별 이야기",
  botduos: "프로 봇 듀오 전체 목록",
  easter: "숨은 이스터 에그",
};
const KIND_PLACEHOLDER = {
  favorite: "즐겨찾기한 이름을 찾아보세요",
  champion: "궁금한 챔피언 이름을 찾아보세요",
  item: "궁금한 아이템 이름을 찾아보세요",
  runes: "예: 감전, 콩콩이, 결의",
  glossary: "예: 갱, CS, 노플, 프리징",
  regions: "지역을 선택해 이야기를 읽어보세요",
  botduos: "예: 자야 라칸, S+, 포킹",
  easter: "예: 렝가, 포로, 춤, 숨은 퀘스트",
};
document.querySelectorAll("[data-kind]").forEach((button) =>
  button.addEventListener("click", () => {
    if (location.hash.startsWith("#card/")) {
      history.replaceState(null, "", `${location.pathname}${location.search}`);
      showDictionary();
    }
    kind = button.dataset.kind;
    document.querySelectorAll("[data-kind]").forEach((b) => {
      const active = b === button;
      b.classList.toggle("active", active);
      b.setAttribute("aria-pressed", active);
    });
    $("#search").value = "";
    selectedInitial = "전체";
    selectedRole = "전체";
    selectedRegion = null;
    selectedRunePath = "all";
    showTimeline = false;
    timelineRegion = "전체";
    $("#easy-only").checked = false;
    $("#search").placeholder = KIND_PLACEHOLDER[kind];
    $("#list-title").textContent = KIND_TITLE[kind];
    render();
  }),
);
const kindTabs = $("#kind-tabs");
const tabsNext = $("#tabs-next");
const updateTabsNext = () => {
  if (!kindTabs || !tabsNext) return;
  const canScroll = kindTabs.scrollWidth > kindTabs.clientWidth + 2;
  const atEnd = kindTabs.scrollLeft + kindTabs.clientWidth >= kindTabs.scrollWidth - 2;
  tabsNext.hidden = !canScroll || atEnd;
  tabsNext.setAttribute("aria-hidden", String(!canScroll || atEnd));
};
kindTabs?.addEventListener("scroll", updateTabsNext, { passive: true });
tabsNext?.addEventListener("click", () => {
  kindTabs?.scrollBy({
    left: Math.max(kindTabs.clientWidth * 0.72, 150),
    behavior: "smooth",
  });
});
window.addEventListener("resize", () => {
  updateTabsNext();
  scheduleCardAlignment();
});
requestAnimationFrame(updateTabsNext);
document.fonts?.ready.then(() => {
  updateTabsNext();
  scheduleCardAlignment();
});
document.addEventListener("keydown", (e) => {
  if (
    e.key === "/" &&
    !$("#detail").open &&
    !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)
  ) {
    e.preventDefault();
    $("#search").focus();
  }
});
const toTop = $("#to-top");
const updateToTop = () => {
  toTop.hidden = window.scrollY < 360;
};
window.addEventListener("scroll", updateToTop, { passive: true });
toTop.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});
updateToTop();
$("#character-card-back").onclick = () => {
  history.replaceState(null, "", `${location.pathname}${location.search}`);
  showDictionary();
  render();
};
$("#character-card-print").onclick = () => window.print();
try {
  for (const value of ["전체", ...initials]) {
    const b = text("button", value);
    b.type = "button";
    b.dataset.initial = value;
    b.setAttribute("aria-pressed", value === selectedInitial);
    b.onclick = () => {
      selectedInitial = value;
      render();
    };
    $("#initials").append(b);
  }
  const r = await fetch("./data/catalog.json?v=champion-review-v3");
  if (!r.ok) throw Error("load");
  const data = await r.json();
  const runesResponse = await fetch("./data/runes.json");
  if (!runesResponse.ok) throw Error("runes load");
  runesData = await runesResponse.json();
  const glossaryResponse = await fetch("./data/glossary.json");
  if (!glossaryResponse.ok) throw Error("glossary load");
  glossaryEntries = await glossaryResponse.json();
  regionStories = await fetch("./data/region-stories.json")
    .then((r) => (r.ok ? r.json() : { regions: {} }))
    .then((d) => d.regions || {})
    .catch(() => ({}));
  regionTimeline = await fetch("./data/region-timeline.json")
    .then((r) =>
      r.ok ? r.json() : { updatedAt: "", notice: "", sources: [], events: [] },
    )
    .catch(() => ({ updatedAt: "", notice: "", sources: [], events: [] }));
  botDuoData = await fetch("./data/bot-duos.json")
    .then((r) => (r.ok ? r.json() : { duos: [] }))
    .catch(() => ({ duos: [] }));
  easterEggData = await fetch("./data/easter-eggs.json")
    .then((r) =>
      r.ok ? r.json() : { updatedAt: "", notice: "", sources: [], eggs: [] },
    )
    .catch(() => ({ updatedAt: "", notice: "", sources: [], eggs: [] }));
  championCounterData = await fetch("./data/champion-counters.json?v=counter-reasons-v3")
    .then((r) => (r.ok ? r.json() : { champions: {} }))
    .catch(() => ({ champions: {} }));
  entries = data.entries;
  patch = data.patch;
  $("#patch").textContent = `자료 버전 ${patch}`;
  render();
  syncRoute();
} catch {
  $("#patch").textContent = "자료를 불러오지 못했어요";
  $("#grid").replaceChildren(
    text(
      "p",
      "사전을 불러오지 못했어요. 인터넷 연결을 확인하고 새로고침해 주세요.",
      "empty",
    ),
  );
}
