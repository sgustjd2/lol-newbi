import { initial, initials, byName } from "./search.js";
const $ = (s) => document.querySelector(s);
let glossaryEntries = [],
  selectedInitial = "전체";
let selectedRole = "전체";
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
  $("#role-filters").hidden = kind === "glossary";
  $("#role-help").hidden = kind === "glossary";
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
const norm = (s) => s.normalize("NFKC").replace(/\s+/g, "").toLowerCase();
function render() {
  roleFilters();
  const q = norm($("#search").value);
  $("#initials").hidden = kind !== "champion";
  $("#glossary-help").hidden = kind !== "glossary";
  $(".easy-filter").hidden = kind === "glossary";
  document.querySelectorAll("[data-initial]").forEach((b) => {
    b.setAttribute("aria-pressed", b.dataset.initial === selectedInitial);
  });
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
  for (const e of list) {
    const card = text("button", "", "card");
    card.type = "button";
    card.setAttribute("aria-label", `${e.name} 설명 보기`);
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
      text(
        "p",
        e.summary || "아직 쉽게 풀고 있어요. 공식 설명을 먼저 볼 수 있어요.",
      ),
      bottom,
    );
    card.addEventListener("click", () => {
      lastFocus = card;
      location.hash = `${e.kind}/${e.id}`;
    });
    $("#grid").append(card);
  }
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
  head.append(portrait(e), title);
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
        const cc = text("div", "", "cc-effects");
        cc.append(text("h5", "맞히면 생기는 방해 효과 · CC"));
        if (advanced.cc.length) {
          for (const effect of advanced.cc) {
            cc.append(
              text("span", effect.name, "cc-badge"),
              text("p", effect.meaning),
              text("p", effect.condition, "cc-condition"),
            );
          }
        } else
          cc.append(
            text(
              "p",
              "현재 원문에서 적용되는 CC를 확인하지 못했어요. 조건부·다른 형태의 효과는 추가 확인이 필요해요.",
              "cc-condition",
            ),
          );
        block.append(cc);
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
    $("#easy-only").checked = false;
    $("#search").placeholder =
      kind === "glossary"
        ? "예: 갱, CS, 노플, 프리징"
        : `궁금한 ${kind === "champion" ? "챔피언" : "아이템"} 이름을 찾아보세요`;
    $("#list-title").textContent =
      kind === "glossary"
        ? "게임 속 말, 쉽게 알아보기"
        : `${kind === "champion" ? "챔피언" : "아이템"} 둘러보기`;
    render();
  }),
);
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
