import { readFile, writeFile, rename } from "node:fs/promises";

const catalog = JSON.parse(await readFile("data/catalog.json", "utf8"));
const existing = await readFile("data/lore.json", "utf8")
  .then(JSON.parse)
  .catch(() => ({ champions: {} }));
const champions = catalog.entries
  .filter((e) => e.kind === "champion")
  .filter((e) => !existing.champions[e.id]);
console.log(`이미 있음 ${Object.keys(existing.champions).length}개, 새로 수집 ${champions.length}개`);

const decode = (s) =>
  s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

const stripHtml = (raw) => {
  raw = raw.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ");
  raw = raw.replace(/<summary[^>]*>[\s\S]*?<\/summary>/gi, " ");
  raw = decode(raw);
  raw = raw.replace(/\[\d+\]/g, "");
  raw = raw.replace(/\[편집\]/g, "");
  raw = raw.replace(/<br[^>]*>/gi, "\n");
  raw = raw.replace(/<\/(p|div|li|td|tr|h[1-6])>/gi, "\n");
  raw = raw.replace(/<[^>]*$/g, "");
  raw = raw.replace(/<[^>]+>/g, "");
  raw = raw.replace(/[ \t]+/g, " ");
  raw = raw.replace(/\n[ \t]+/g, "\n");
  raw = raw.replace(/\n{2,}/g, "\n\n").trim();
  return raw;
};

// Extracts section `s-N` up to (not including) the next TOP-LEVEL section
// (a heading whose number is strictly greater than N — subsections like s-N.1 keep siblings together).
const extractTopSection = (html, n) => {
  const idMatch = html.indexOf(`id='s-${n}'`);
  if (idMatch < 0) return null;
  const startMatch = html.lastIndexOf("<", idMatch);
  const nextRe = /id='s-(\d+)'/g;
  nextRe.lastIndex = idMatch + 1;
  let end = html.length;
  let m;
  while ((m = nextRe.exec(html))) {
    if (Number(m[1]) > n) {
      end = html.lastIndexOf("<", m.index);
      break;
    }
  }
  return stripHtml(html.slice(startMatch, end));
};

const looksLikeChampionPage = (html, name) =>
  html.includes("id='배경'") && html.includes("주 역할군") && html.includes(name);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchPage = async (url) => {
  for (let attempt = 0; attempt < 4; attempt++) {
    const r = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(20000),
    });
    if (r.status === 429) {
      await sleep(3000 * (attempt + 1));
      continue;
    }
    if (!r.ok) return null;
    return r.text();
  }
  return null;
};

// Split a section-2 text block into {intro, rest}: intro is the prose before
// the first numbered subsection (e.g. "2.1. 챔피언 관계"), rest is everything
// from that subsection onward (relationships, etc). If there's no subsection,
// rest is "".
const splitIntroAndSubsections = (text) => {
  const withoutHeading = text.replace(/^2\.\s*배경\s*/, "").trim();
  const m = withoutHeading.match(/\n\n(\d+\.\d+\.\s)/);
  if (!m) return { intro: withoutHeading, rest: "" };
  return {
    intro: withoutHeading.slice(0, m.index).trim(),
    rest: withoutHeading.slice(m.index).trim(),
  };
};

const detailedRefPattern = /([가-힣A-Za-z0-9() ]+?)\/배경(?:\s*및\s*[가-힣]+)?\s*(?:문서\s*)?참조/;

const lore = { ...existing.champions };
const failed = [];
let next = 0;
await Promise.all(
  Array.from({ length: 3 }, async () => {
    while (next < champions.length) {
      const c = champions[next++];
      await sleep(300);
      const candidates = [
        `https://namu.wiki/w/${encodeURIComponent(c.name)}`,
        `https://namu.wiki/w/${encodeURIComponent(c.name + "(리그 오브 레전드)")}`,
      ];
      let result = null;
      for (const url of candidates) {
        try {
          const html = await fetchPage(url);
          if (!html || !looksLikeChampionPage(html, c.name)) continue;
          const section2 = extractTopSection(html, 2);
          if (!section2 || section2.length < 30) continue;
          const { intro, rest } = splitIntroAndSubsections(section2);
          let background = intro;
          let detailUrl = url;
          const refMatch = intro.match(detailedRefPattern);
          if (refMatch) {
            const subUrl = `https://namu.wiki/w/${encodeURIComponent(refMatch[1].trim() + "/배경")}`;
            try {
              const subHtml = await fetchPage(subUrl);
              if (subHtml) {
                const sub1 = extractTopSection(subHtml, 1);
                if (sub1 && sub1.length > intro.length) {
                  background = sub1.replace(/^1\.\s*(장문\s*)?배경\s*/, "").trim();
                  detailUrl = subUrl;
                }
              }
            } catch {
              // fall back to intro
            }
          }
          result = {
            text: rest ? `${background}\n\n${rest}` : background,
            sourceTitle: `${c.name} - 나무위키`,
            sourceUrl: detailUrl,
          };
          break;
        } catch {
          // try next candidate
        }
      }
      if (result) lore[c.id] = result;
      else failed.push(c.id);
    }
  }),
);

await writeFile(
  "data/lore.tmp",
  JSON.stringify({ patch: catalog.patch, syncedAt: new Date().toISOString(), champions: lore }, null, 2),
);
await rename("data/lore.tmp", "data/lore.json");
const total = catalog.entries.filter((e) => e.kind === "champion").length;
console.log(`배경 이야기 수집: ${Object.keys(lore).length}/${total} (이번 실패 ${failed.length})`);
if (failed.length) console.log("실패:", failed.join(", "));
