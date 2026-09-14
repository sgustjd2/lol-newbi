export function validateNotes(notes, catalog) {
  if (!Array.isArray(notes) || !notes.length)
    throw Error("설명 배열이 필요합니다.");
  const seen = new Set();
  return notes.map((n) => {
    if (!n || typeof n !== "object") throw Error("잘못된 항목");
    const key = `${n.kind}/${n.id}`;
    if (seen.has(key)) throw Error(`중복: ${key}`);
    seen.add(key);
    if (!catalog.entries.some((e) => e.id === n.id && e.kind === n.kind))
      throw Error(`없는 항목: ${key}`);
    for (const [field, max] of [
      ["summary", 60],
      ["analogy", 120],
      ["tip", 120],
      ["caution", 120],
      ["sourceTitle", 200],
      ["evidence", 10000],
    ]) {
      if (
        typeof n[field] !== "string" ||
        !n[field].trim() ||
        n[field].length > max ||
        /<[^>]*>/.test(n[field])
      )
        throw Error(`잘못된 ${field}: ${key}`);
    }
    if (
      n.sourceType !== "notebooklm" ||
      n.reviewed !== true ||
      n.patch !== catalog.patch
    )
      throw Error(`출처, 검수 또는 패치 확인 필요: ${key}`);
    const u = new URL(n.sourceUrl);
    if (
      u.protocol !== "https:" ||
      u.username ||
      u.password ||
      u.hostname === "notebook.google.com" ||
      u.hostname === "notebooklm.google.com"
    )
      throw Error(`공개 근거 URL 필요: ${key}`);
    return {
      id: n.id,
      kind: n.kind,
      summary: n.summary.trim(),
      analogy: n.analogy.trim(),
      tip: n.tip.trim(),
      caution: n.caution.trim(),
      sourceType: n.sourceType,
      sourceTitle: n.sourceTitle.trim(),
      explanationSourceUrl: u.href,
      patch: n.patch,
      reviewed: true,
    };
  });
}
