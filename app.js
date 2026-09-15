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
  regionStories = {},
  botDuoData = { patch: "", notice: "", sources: [], duos: [] },
  championCounterData = { patch: "", notice: "", champions: {} },
  selectedInitial = "전체";
let selectedRole = "전체";
let selectedRegion = null;
let botDuoView = "tier";
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
const norm = (s) => s.normalize("NFKC").replace(/\s+/g, "").toLowerCase();
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
        ? e.sourceType === "notebooklm"
          ? "NotebookLM · 검수 완료"
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
  const toggle = text("button", "＋ 펼치기", "card-toggle");
  toggle.type = "button";
  toggle.title = `${e.name} 설명 펼치기`;
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-controls", cardId);
  toggle.setAttribute("aria-label", `${e.name} 설명 펼치기`);
  toggle.onclick = (event) => {
    event.stopPropagation();
    const open = wrap.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(open));
    toggle.textContent = open ? "− 접기" : "＋ 펼치기";
    toggle.title = `${e.name} 설명 ${open ? "접기" : "펼치기"}`;
    toggle.setAttribute("aria-label", `${e.name} 설명 ${open ? "접기" : "펼치기"}`);
  };
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
  wrap.append(card, toggle, fav);
  return wrap;
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
      "상대할 때 자주 선택하는 챔피언이에요. 아이콘을 누르면 각 챔피언의 스킬 상호작용을 한 줄로 볼 수 있어요.",
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
    const reason = text("p", counter.reason, "champion-counter-reason");
    reason.hidden = true;
    button.onclick = () => {
      if (openReason && openReason !== reason) {
        openReason.hidden = true;
        openButton?.setAttribute("aria-expanded", "false");
      }
      const expanded = reason.hidden;
      reason.hidden = !expanded;
      button.setAttribute("aria-expanded", String(expanded));
      openReason = expanded ? reason : null;
      openButton = expanded ? button : null;
    };
    item.append(button, reason);
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
    heading.append(text("span", group.label), text("small", `${group.duos.length}개 조합`));
    section.append(heading);
    for (const duo of group.duos) section.append(botDuoCard(duo));
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
  if (kind === "regions") {
    $("#grid").replaceChildren();
    if (!selectedRegion) {
      $("#count").textContent = `${REGIONS.length}개 지역`;
      const picker = text("div", "", "region-picker");
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
}
function openDetail() {
  const [type, id] = location.hash.slice(1).split("/");
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
              `이 스킬은 이름(${skill.name})에 형태·조건이 두 가지 있어요. 위 계수는 그중 한 조건만 확인된 값일 수 있고, 다른 조건의 계수는 아직 확인되지 않았어요.`,
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
        ? `${e.sourceType === "notebooklm" ? "NotebookLM · 검수 완료" : "편집 예시 · NotebookLM 검수 전"} · 설명 기준 ${e.patch || patch}`
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
  if (e.sourceType === "notebooklm") {
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
window.addEventListener("hashchange", openDetail);
$("#search").addEventListener("input", render);
$("#easy-only").addEventListener("change", render);
const KIND_TITLE = {
  favorite: "내 즐겨찾기",
  champion: "챔피언 둘러보기",
  item: "아이템 둘러보기",
  glossary: "게임 속 말, 쉽게 알아보기",
  regions: "지역별 이야기",
  botduos: "프로 봇 듀오 전체 목록",
};
const KIND_PLACEHOLDER = {
  favorite: "즐겨찾기한 이름을 찾아보세요",
  champion: "궁금한 챔피언 이름을 찾아보세요",
  item: "궁금한 아이템 이름을 찾아보세요",
  glossary: "예: 갱, CS, 노플, 프리징",
  regions: "지역을 선택해 이야기를 읽어보세요",
  botduos: "예: 자야 라칸, S+, 포킹",
};
document.querySelectorAll("[data-kind]").forEach((button) =>
  button.addEventListener("click", () => {
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
window.addEventListener("resize", updateTabsNext);
requestAnimationFrame(updateTabsNext);
document.fonts?.ready.then(updateTabsNext);
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
  const r = await fetch("./data/catalog.json");
  if (!r.ok) throw Error("load");
  const data = await r.json();
  const glossaryResponse = await fetch("./data/glossary.json");
  if (!glossaryResponse.ok) throw Error("glossary load");
  glossaryEntries = await glossaryResponse.json();
  regionStories = await fetch("./data/region-stories.json")
    .then((r) => (r.ok ? r.json() : { regions: {} }))
    .then((d) => d.regions || {})
    .catch(() => ({}));
  botDuoData = await fetch("./data/bot-duos.json")
    .then((r) => (r.ok ? r.json() : { duos: [] }))
    .catch(() => ({ duos: [] }));
  championCounterData = await fetch("./data/champion-counters.json?v=counter-reasons")
    .then((r) => (r.ok ? r.json() : { champions: {} }))
    .catch(() => ({ champions: {} }));
  entries = data.entries;
  patch = data.patch;
  $("#patch").textContent = `자료 버전 ${patch}`;
  render();
  openDetail();
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
