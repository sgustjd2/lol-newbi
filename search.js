export const initials = [
  "ㄱ",
  "ㄴ",
  "ㄷ",
  "ㄹ",
  "ㅁ",
  "ㅂ",
  "ㅅ",
  "ㅇ",
  "ㅈ",
  "ㅊ",
  "ㅋ",
  "ㅌ",
  "ㅍ",
  "ㅎ",
];
export function initial(name) {
  const code = name.normalize("NFC").charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return "";
  return [
    "ㄱ",
    "ㄱ",
    "ㄴ",
    "ㄷ",
    "ㄷ",
    "ㄹ",
    "ㅁ",
    "ㅂ",
    "ㅂ",
    "ㅅ",
    "ㅅ",
    "ㅇ",
    "ㅈ",
    "ㅈ",
    "ㅊ",
    "ㅋ",
    "ㅌ",
    "ㅍ",
    "ㅎ",
  ][Math.floor(code / 588)];
}
export const byName = (a, b) => a.name.localeCompare(b.name, "ko");
