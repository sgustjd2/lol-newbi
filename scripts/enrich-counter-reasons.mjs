import { readFile, writeFile } from "node:fs/promises";

const countersPath = "data/champion-counters.json";
const catalog = JSON.parse(await readFile("data/catalog.json", "utf8"));
const countersText = await readFile(countersPath, "utf8");
const eol = countersText.includes("\r\n") ? "\r\n" : "\n";
const counters = JSON.parse(countersText);
const champions = catalog.entries.filter((entry) => entry.kind === "champion");
const names = new Map(champions.map((champion) => [champion.id, champion.name]));

// 통계 페이지의 순위는 유지하고, 표시 문장만 챔피언의 실제 스킬 상호작용으로 풀어 씁니다.
// {target}은 카운터를 당하는 챔피언 이름으로 치환됩니다.
const mechanics = {
  Aatrox: "Q를 세 번 휘둘러 끝자락으로 띄우고, E로 따라붙어 긴 싸움에서 회복해요.",
  Ahri: "E 매혹으로 움직임을 끊고 R 돌진을 세 번 쓰며 위험할 때 빠져나와요.",
  Akali: "W 연막으로 모습을 숨긴 뒤 E와 R로 짧게 들락날락하며 공격해요.",
  Akshan: "Q 부메랑으로 계속 견제하고 W 위장으로 먼저 움직여요.",
  Alistar: "Q 띄우기와 W 박치기로 먼저 밀어내서 근접 공격을 끊어요.",
  Amumu: "Q 붕대로 붙고 R 광역 속박으로 여러 명을 한 번에 묶어요.",
  Anivia: "W 얼음벽으로 길을 막고 R 눈보라로 좁은 지역을 오래 통제해요.",
  Annie: "패시브 기절을 모아 Q와 R 티버로 한 번에 폭발시켜요.",
  AurelionSol: "W로 지형을 넘고 E에 적을 모은 뒤 R로 넓게 기절시켜요.",
  Aurora: "W로 사라졌다 돌아오고 R 영역에 적을 가둬 반복 피해를 줘요.",
  Belveth: "공허 산호로 변신한 뒤 연속 돌진과 빠른 공격으로 긴 싸움을 이겨요.",
  Brand: "스킬에 불을 붙여 폭발시키고 R을 적 사이에 튕겨 뭉친 상대를 태워요.",
  Braum: "패시브 4타 기절과 방패로 첫 공격을 막아 아군이 안전하게 때려요.",
  Briar: "W 광란으로 체력을 회복하며 달려들고 E로 피해를 줄이며 밀쳐내요.",
  Cassiopeia: "W 독 장판으로 이동을 묶고 E를 연속 사용해 가까이 온 적을 녹여요.",
  Chogath: "Q 띄우기와 W 침묵으로 행동을 막고 R 포식으로 마무리해요.",
  Corki: "Q와 R 포킹으로 멀리서 체력을 깎고 W 발키리로 자리를 바꿔요.",
  Darius: "Q 바깥 도끼와 출혈 5중첩으로 맞붙을수록 더 세져요.",
  Diana: "Q 표식을 남긴 뒤 R로 여러 적을 끌어당겨 한 번에 들어가요.",
  DrMundo: "Q 식칼 둔화로 계속 맞히고 궁극기 재생으로 오래 버텨요.",
  Ekko: "W 기절 장판을 깔고 E로 들어간 뒤 R로 잃은 체력을 되돌려요.",
  Elise: "E 고치 기절 후 거미줄타기로 공격을 피하고 내려와 마무리해요.",
  Evelynn: "6레벨 뒤 위장으로 시야를 피해 뒤에서 매혹과 폭딜을 넣어요.",
  Fiddlesticks: "시야 밖에서 R 광역 공포로 갑자기 들어와 전투를 시작해요.",
  Fiora: "W 응수로 핵심 공격을 막고 급소를 터뜨려 튼튼한 적도 빠르게 잡아요.",
  Fizz: "E 재간둥이로 공격을 피하고 R 물고기로 먼저 표식을 남겨요.",
  Galio: "W 도발로 공격을 받아내고 E 돌진과 R 합류로 진입을 끊어요.",
  Gangplank: "Q로 안전하게 골드를 벌고 E 화약통으로 둔화와 폭발 피해를 노려요.",
  Garen: "Q 침묵과 E 회전으로 짧게 교환하고 W로 들어오는 피해를 줄여요.",
  Gragas: "E 몸통 박치기와 R 술통으로 끊고 밀어내며 거리를 조절해요.",
  Gwen: "W 안개 속에서는 바깥 공격을 맞지 않고 Q와 R로 가까운 적을 베어요.",
  Heimerdinger: "포탑을 세워 접근로를 막고 E 수류탄 기절로 들어오는 적을 저지해요.",
  Hwei: "장거리 스킬로 지역을 통제하고 E 속박과 공포로 접근을 막아요.",
  Illaoi: "촉수와 영혼 뽑기로 1대1을 강하게 만들고 R로 뛰어드는 적을 함께 때려요.",
  Irelia: "미니언 표식으로 연속 돌진해 스킬을 피하고 E 기절로 반격해요.",
  Ivern: "수풀과 보호막, 데이지로 아군을 지키며 상대의 진입을 늦춰요.",
  Janna: "Q 띄우기와 R 밀쳐내기로 붙은 적을 떼고 E 보호막으로 교환해요.",
  JarvanIV: "깃창으로 확실히 붙고 R 벽에 가둬 도주를 막아요.",
  Jayce: "해머와 캐논을 바꿔 원거리 포킹 뒤 밀쳐내고 근접 마무리를 해요.",
  Jinx: "긴 사거리 로켓과 덫 속박으로 먼저 체력을 깎고 처치하면 더 빨라져요.",
  Karma: "Q로 계속 견제하고 E 강화 보호막으로 교환마다 이득을 봐요.",
  Karthus: "죽어도 7초 동안 스킬을 쓰고 R 전역 궁으로 멀리 있는 적까지 때려요.",
  Kassadin: "마법 피해 보호막과 R 연속 순간이동으로 마법 공격을 피해요.",
  Katarina: "단검을 주우면 E가 초기화되어 계속 이동하고 R로 주변을 휩쓸어요.",
  Kayle: "레벨이 오를수록 사거리가 길어지고 R 무적으로 {target}의 결정타를 한 번 막아요.",
  Kennen: "E로 빠르게 파고들어 R 광역 번개로 기절을 쌓아요.",
  Kindred: "표식 사냥으로 사거리와 공격력을 키우고 R 무적으로 죽을 타이밍을 피해요.",
  Kled: "스칼에서 내려도 다시 올라타고 R 돌진으로 먼저 싸움을 열어요.",
  KogMaw: "W로 사거리와 체력 비례 피해를 늘려 튼튼한 적도 멀리서 녹여요.",
  Leblanc: "W 순간이동으로 스킬을 피하고 E 속박 후 원래 자리로 돌아가요.",
  Leona: "E로 붙어 Q 기절을 넣고 W 방어력으로 공격을 받아내요.",
  Lillia: "Q로 이동 속도를 쌓고 R 수면으로 한타의 핵심을 재워요.",
  Lissandra: "W 속박과 R 기절로 암살자를 묶고 E로 안전하게 빠져요.",
  Lulu: "W 변이와 R 띄우기, E 보호막으로 달려드는 적을 무력화해요.",
  Lux: "Q 속박으로 멈추고 E와 R을 멀리서 이어 체력을 크게 깎아요.",
  Malphite: "Q 둔화로 속도를 훔치고 R로 적진에 순간적으로 뛰어들어요.",
  Malzahar: "패시브 보호막으로 첫 스킬을 막고 R 제압으로 한 명을 고정해요.",
  Maokai: "W 뿌리묶기로 먼저 붙고 Q 밀쳐내기와 묘목으로 길목을 관리해요.",
  MasterYi: "Q로 대상 지정 공격을 피하고 R로 둔화를 무시하며 약한 적부터 베어요.",
  Mel: "W 반사 장벽으로 핵심 투사체를 돌려보내고 R 표식을 쌓아 마무리해요.",
  Milio: "Q로 접근을 밀어내고 W 사거리 증가와 E 보호막으로 원딜을 지켜요.",
  MonkeyKing: "W 분신으로 공격을 빼고 E 돌진과 R 회전으로 여러 명을 띄워요.",
  Morgana: "E 주문 방어막으로 CC를 막고 Q 속박으로 역공해요.",
  Naafiri: "사냥개 무리와 함께 W와 E로 연속 돌진해 외로운 적을 물어요.",
  Nami: "Q 물방울 기절과 R 파도로 진입을 끊고 E 강화로 아군을 도와요.",
  Nasus: "W 쇠약으로 공격 속도와 이동 속도를 낮추고 Q 강화 평타로 오래 싸워요.",
  Neeko: "W 분신으로 스킬을 속이고 E 속박과 R 기절로 한 번에 반격해요.",
  Nidalee: "창을 맞히면 쿠거로 변해 W와 Q로 급습하고 E로 회복해요.",
  Nilah: "W로 기본 공격을 피하고 E 돌진과 R 끌어당김으로 근접 교전을 만들어요.",
  Nocturne: "R 어둠으로 시야를 끊고 먼 거리에서도 바로 달려들어요.",
  Nunu: "눈덩이 W로 빠르게 진입하고 R 둔화 장판으로 도주를 막아요.",
  Olaf: "R로 CC를 무시하고 Q 도끼 둔화로 끝까지 추격해요.",
  Ornn: "W 불꽃 숨결로 불안정 상태를 만들고 R 뿔로 멀리서 교전을 시작해요.",
  Pantheon: "E 방패로 앞 공격을 막고 W 확정 기절로 바로 반격해요.",
  Poppy: "W로 돌진을 막고 E 벽꿍과 R 날리기로 진입 챔피언을 떼어내요.",
  Qiyana: "지형 원소로 속박과 은신을 만들고 R 벽 기절로 좁은 곳에서 폭발해요.",
  Quinn: "Q 실명으로 평타를 막고 E 밀치기로 거리를 벌려요.",
  Rammus: "W 방어 자세로 평타를 되돌려주고 E 도발로 공격 대상을 고정해요.",
  RekSai: "땅속 감지로 숨어도 찾고 W 띄우기와 R 돌진으로 마무리해요.",
  Rell: "W 말에서 내리며 띄우고 R 자력으로 적을 끌어당겨 묶어요.",
  Renata: "W로 아군을 한 번 더 싸우게 하고 R 광란으로 적끼리 공격하게 해요.",
  Riven: "Q 세 번 돌진과 W 기절, E 방패로 짧은 교환을 반복해요.",
  Ryze: "W 속박과 E 확산 표식으로 붙은 적을 묶고 Q를 연속으로 맞혀요.",
  Samira: "W로 투사체를 지우고 E 돌진과 R 난사로 가까운 싸움을 압도해요.",
  Sejuani: "Q 돌진과 R 빙하 감옥으로 먼저 묶고 W 둔화로 추격해요.",
  Senna: "긴 사거리와 Q 회복으로 조금씩 때리며 E 안개로 안전하게 이동해요.",
  Seraphine: "W 보호막과 회복으로 버티고 E 속박과 R 매혹으로 진입을 받아쳐요.",
  Sett: "W 방패와 고정 피해로 맞은 만큼 되돌리고 E 기절로 붙잡아요.",
  Shaco: "Q 은신으로 뒤를 잡고 상자 공포와 분신으로 싸움을 어지럽혀요.",
  Shen: "W로 평타를 막고 E 도발과 R 보호막으로 아군을 살려요.",
  Shyvana: "용 변신 R로 진입하고 E 불꽃 표식으로 체력 비례 피해를 줘요.",
  Singed: "Q 독구름을 남기며 뛰어다니고 E 뒤집기로 접근한 적을 넘겨요.",
  Sion: "Q 충전 띄우기와 R 돌진으로 길게 진입해 한타를 시작해요.",
  Skarner: "W 보호막으로 버티고 E 기절과 R 꿰뚫기로 적을 끌고 가요.",
  Smolder: "Q 중첩이 쌓이면 광역 불꽃과 R로 뒤에서 안전하게 공격해요.",
  Sona: "Q로 계속 견제하고 W 회복과 R 기절로 싸움을 뒤집어요.",
  Soraka: "Q로 적을 맞히며 회복하고 E 침묵 장판으로 진입을 막아요.",
  Swain: "E 끌어오기와 W 시야 공격 후 R 흡수로 오래 버텨요.",
  Sylas: "E 사슬로 붙고 W 회복과 R 빼앗기로 상대 궁극기도 활용해요.",
  TahmKench: "Q 혀 둔화와 W 삼키기로 한 명을 끌어내고 E 회색 체력으로 버텨요.",
  Taliyah: "E 바위밭으로 돌진을 막고 W 밀쳐내기와 Q 포킹을 이어가요.",
  Talon: "벽을 넘으며 빠르게 접근하고 W 표식과 R 은신으로 암살해요.",
  Taric: "E 기절과 W 연결로 아군 방어를 공유하고 R 무적으로 버텨요.",
  Teemo: "Q 실명으로 평타를 막고 버섯으로 길목을 지켜요.",
  Thresh: "Q 사슬과 E 밀치기, R 벽으로 적을 묶고 랜턴으로 아군을 구해요.",
  Trundle: "기둥으로 길을 막고 R로 적의 방어력과 체력을 훔쳐요.",
  Tryndamere: "E 회전으로 붙고 R 5초 무적으로 죽지 않아 마무리를 피해요.",
  TwistedFate: "W 골드 카드로 {target}의 움직임을 멈추고 R로 다른 라인에서 먼저 이득을 만들어요.",
  Udyr: "여러 자세의 보호막과 기절, 광역 둔화로 오래 싸워요.",
  Varus: "Q 충전 화살로 멀리서 체력을 깎고 R 속박으로 도주를 막아요.",
  Veigar: "E 사건의 지평선으로 도망길을 막고 R로 체력 낮은 적을 마무리해요.",
  Velkoz: "Q 둔화와 E 띄우기 후 긴 사거리 R로 움직임이 멈춘 적을 녹여요.",
  Vex: "패시브 공포로 돌진을 끊고 R 표식으로 연속 돌진해요.",
  Vi: "Q 돌진과 R 확정 추격으로 숨은 적도 끝까지 따라가요.",
  Viktor: "E 레이저와 R 폭풍으로 지역을 지배하고 W 중력장으로 접근을 막아요.",
  Vladimir: "W 피의 웅덩이로 공격을 피하고 Q 회복과 R 증폭으로 오래 버텨요.",
  Volibear: "Q 달리기 기절과 R 도약으로 먼저 붙고 W 물어뜯기로 회복해요.",
  Warwick: "Q로 체력을 회복하고 R 제압으로 약해진 적을 묶어요.",
  Xayah: "깃털을 깔아 E로 속박하고 R로 잠시 무적이 되어 위험을 피해요.",
  Xerath: "Q와 W, R 장거리 포격으로 접근 전에 체력을 깎고 E 기절을 넣어요.",
  Yasuo: "W 바람 장막으로 투사체를 막고 Q 회오리와 R로 띄운 적을 추격해요.",
  Yone: "E 영혼해방으로 안전하게 들어갔다 돌아오고 R로 여러 적을 띄워요.",
  Yorick: "W 벽으로 가두고 구울과 안개 여왕으로 길게 압박해요.",
  Yuumi: "아군에게 붙어 대상 지정 공격을 피하고 Q 둔화와 E 회복으로 버텨요.",
  Zaahen: "Q 연속 베기와 W 끌어오기, E 돌진으로 근접전에서 회복해요.",
  Zac: "E 새총 발사로 먼 거리에서 뛰어들고 패시브 조각으로 다시 살아나요.",
  Zed: "W 그림자와 R 표식으로 순식간에 파고들고 위험하면 그림자로 돌아가요.",
  Zeri: "E 벽 타기와 R 과충전으로 빠르게 움직이며 긴 싸움에서 강해져요.",
  Ziggs: "Q 폭탄과 E 지뢰, R 대포로 멀리서 지역을 막아요.",
  Zilean: "Q 폭탄 기절과 E 둔화·가속으로 속도를 조절하고 R로 아군을 부활시켜요.",
  Zoe: "E 수면방울로 먼저 재우고 Q 별 탄환을 멀리서 크게 맞혀요.",
  Zyra: "식물을 깔아 접근로를 막고 E 속박과 R 띄우기로 역습해요.",
};

function topic(name) {
  const last = [...name.replace(/\s/g, "")].at(-1)?.charCodeAt(0);
  const hasFinal = last >= 0xac00 && last <= 0xd7a3 && (last - 0xac00) % 28 !== 0;
  return `${name}${hasFinal ? "은" : "는"}`;
}

const used = new Set();
for (const [targetId, target] of Object.entries(counters.champions)) {
  const targetName = names.get(targetId) || targetId;
  for (const counter of target.counters) {
    const mechanic = mechanics[counter.id];
    if (!mechanic) throw new Error(`카운터 설명이 없는 챔피언: ${counter.id}`);
    const counterName = names.get(counter.id) || counter.id;
    counter.reason = `${topic(counterName)} ${mechanic.replaceAll("{target}", targetName)}`;
    used.add(counter.id);
  }
}

const expected = new Set(Object.values(counters.champions).flatMap((entry) => entry.counters.map((counter) => counter.id)));
if (used.size !== expected.size) throw new Error("카운터 설명 적용 수가 맞지 않습니다.");
counters.reasonVersion = "champion-mechanics-v2";
counters.methodology = "LoLalytics 챔피언별 카운터 페이지의 ‘countered most by’ 상위 3명을 유지하고, 각 카운터 챔피언의 실제 스킬 상호작용을 초보자용 한 줄 설명으로 정리했습니다.";
counters.notice = "카운터는 패치·역할·티어·표본에 따라 달라질 수 있는 참고 정보예요. 이유 문장은 공식 통계 문장을 그대로 옮기지 않고, 챔피언 스킬과 전투 방식의 상호작용을 쉽게 풀어쓴 설명이에요.";
await writeFile(
  countersPath,
  `${JSON.stringify(counters, null, 2).replaceAll("\n", eol)}${eol}`,
);
console.log(`Updated ${used.size} counter champions in ${countersPath}`);
