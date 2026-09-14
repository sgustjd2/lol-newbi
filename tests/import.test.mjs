import { test } from "node:test";
import assert from "node:assert/strict";
import { validateNotes } from "../scripts/validate.mjs";
const catalog = {
  patch: "16.18.1",
  entries: [{ id: "Garen", kind: "champion" }],
};
const note = {
  id: "Garen",
  kind: "champion",
  summary: "가까운 적과 싸워요.",
  analogy: "팽이처럼 돌아요.",
  tip: "가까이서 써요.",
  caution: "멀리서는 안 닿아요.",
  sourceType: "notebooklm",
  sourceTitle: "공식 스킬",
  sourceUrl: "https://www.leagueoflegends.com/ko-kr/champions/garen/",
  evidence: "원본 근거",
  patch: "16.18.1",
  reviewed: true,
};
test("공개 데이터에서 비공개 근거와 임의 필드를 제외", () => {
  const [result] = validateNotes([{ ...note, secret: "private" }], catalog);
  assert.equal(result.evidence, undefined);
  assert.equal(result.secret, undefined);
  assert.equal(result.reviewed, true);
});
test("미검수, 오래된 패치, 중복, 알 수 없는 ID 거부", () => {
  for (const edit of [{ reviewed: false }, { patch: "1" }, { id: "missing" }])
    assert.throws(() => validateNotes([{ ...note, ...edit }], catalog));
  assert.throws(() => validateNotes([note, note], catalog));
});
test("HTML 및 비공개 노트북 주소 거부", () => {
  for (const edit of [
    { summary: "<script>alert(1)</script>" },
    { sourceUrl: "javascript:alert(1)" },
    { sourceUrl: "https://notebook.google.com/notebook/private" },
  ])
    assert.throws(() => validateNotes([{ ...note, ...edit }], catalog));
});
