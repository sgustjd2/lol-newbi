# 롤린이 백과사전 — Claude 세션 인수인계 문서

이 문서는 새 Claude 세션이 현재 작업을 이어받기 위한 실행 문서다. 먼저 이 파일을 읽고, 이어서 `prd.md`, `README.md`, `docs/notebooklm-import.md`를 읽는다. 쉬운 설명 누락 조사는 `docs/claude-easy-explanations.md`와 `docs/claude-easy-explanations-prompt.md`를 사용한다. 현재 작업 폴더는 `E:\\workspace\\lol-guide`다.

## 사용자 목표

리그 오브 레전드를 처음 접하는 사람이 챔피언, 스킬, 아이템, 게임 용어를 짧고 쉬운 한국어로 이해하는 정적 웹사이트를 만든다. 설명은 어린아이에게 말하듯 쉽게 쓰되, 피해 종류·대상·조건·한계는 생략하지 않는다. 챔피언과 아이템은 모두 찾아볼 수 있어야 하고, NotebookLM 자료를 근거로 쉬운 설명을 정제해 넣는다. 배포 목표는 GitHub Pages다.

## 지금 구현된 상태

- 정적 HTML/CSS/JavaScript 사이트가 구현되어 있다.
- Data Dragon 16.18.1 기준 챔피언 173개, 아이템 251개를 `data/catalog.json`에 저장했다.
- 챔피언마다 Q/W/E/R 이름·공식 설명·아이콘·기본 지속 효과 아이콘이 있다.
- 가렌, 럭스, 애쉬, 애니, 말파이트, 소라카의 Q/W/E/R은 쉬운 편집 설명을 넣었다. 나머지는 공식 설명을 쉬운 문장으로 표현 정리한다.
- 스킬 상세에는 `자세히 보기 · AD/AP 계수`가 있다. 선형으로 해석 가능한 계산식만 표시하며, 확인하지 못한 계산식은 0으로 추정하지 않고 확인 필요로 남긴다.
- 스킬 설명에서 기절, 속박, 침묵, 둔화, 공중 띄우기 등 CC 효과와 근거 문장을 추출한다. 자기 자신에게 걸린 CC 제거는 CC로 표시하지 않는다. 애니는 방화광 조건을 보완한다.
- 아이템에는 공식 태그·능력치·효과를 바탕으로 AD, AP, 탱커, 서포터, 공용 용도를 복수 분류한다. 전용 포지션이나 구매 추천 순위가 아니다.
- 챔피언·아이템 탭에 역할군 필터가 있다. 챔피언은 전사, 탱커, 마법사, 암살자, 원거리 딜러, 서포터이고, 아이템은 AD, AP, 탱커, 서포터, 공용이다.
- 챔피언은 가나다순이고, 전체/ㄱ~ㅎ 초성 필터를 검색과 조합할 수 있다. 쌍자음은 기본 자음에 포함한다.
- 용어정리 탭에 36개 용어와 별칭, 영어 이름, 쉬운 뜻, 채팅 예문이 있다.
- `봇 듀오` 탭에 `data/bot-duos.json`의 2026 시즌 공개 프로 대회 경기 2,057건에서 1경기 이상 나온 411개 조합이 있다. `등급별 보기`, `원딜 챔피언 기준`, `서폿 챔피언 기준` 버튼으로 조합을 묶어 보고, 조합별 카운터 2개와 초보자용 궁합·운영 설명을 보여준다. 현재 수집 범위는 16.01–16.17이며 통계는 패치·지역·티어·표본에 따라 달라지는 참고 자료다.
- 챔피언 상세 팝업의 `대표 카운터 픽` 영역은 `data/champion-counters.json`의 16.18 LoLalytics 카운터 상위 3명을 아이콘으로 표시한다. 아이콘 버튼을 누르면 카운터 챔피언의 실제 스킬 상호작용을 바탕으로 한 이유 한 줄이 펼쳐지며, 모든 173개 챔피언에 데이터가 있다. 이유 문구를 다시 생성할 때는 `npm run enrich:counters`를 사용한다.
- 흰색 배경, 리그 오브 레전드에서 착안한 남색·금색·청색 테마를 사용한다. 당근 SEED CSS 2.8.1의 토큰을 `seed.css`로 포함해 간격·모서리 규칙에 활용한다.
- 검색, 탭 전환, 역할 필터, 초성 필터, 쉬운 설명 필터, 상세 대화상자, Escape 닫기, 뒤로 가기, 빈 결과, 390px 모바일을 브라우저에서 확인했다.
- `npm test`는 현재 25개 테스트를 통과한다.
- NotebookLM에서 실제 추출한 데이터는 아직 0건이다. `data/explanations.json`의 쉬운 설명 10건은 편집 예시이고, NotebookLM 검수 완료가 아니다.
- Git 저장소를 초기화하고 `https://github.com/sgustjd2/lol-newbi`에 연결했다. `main` 브랜치에 push했고, GitHub Pages를 Actions 소스로 활성화해 `.github/workflows/pages.yml`이 배포한다. 배포 주소는 `https://sgustjd2.github.io/lol-newbi/`다.
- 이름에 " / "가 있는 스킬(변신·조건부 스킬, 예: 니달리·제이스·럭스식 스탠스 전환 등 24개)은 `data/skill-details.json`에서 `formVariant: true`로 표시한다. 계수 파서는 여전히 한 조건의 스펠만 매칭하므로(`scripts/sync-details.mjs`), 화면에서는 표시된 계수가 두 형태 중 하나일 수 있다는 안내 문구를 보여준다. 두 번째 형태의 실제 계수를 CommunityDragon에서 추가로 매칭해 보여주는 것은 아직 하지 않았다 — 챔피언마다 내부 스펠 키 이름이 달라 추측 매칭이 위험하기 때문이다.
- "오늘의 작은 지식" 카드(홈 상단 고정 팁)는 제거했다. 브랜드 아이콘과 파비콘은 Fable 5.1로 디자인한 방패+한입 모티프(`favicon.svg`, 헤더의 `.brand-icon` 인라인 SVG)로 교체했다.

## 반드시 지킬 데이터 원칙

1. NotebookLM의 원문, 노트북 ID, 로그인 정보, 비공개 인용은 공개 `dist`에 넣지 않는다.
2. NotebookLM 답변에 없는 수치·조건·스킬 효과를 추측하지 않는다.
3. `sourceType: "notebooklm"` 항목은 사람이 원문과 공식 자료를 대조한 뒤에만 `reviewed: true`로 바꾼다.
4. 스킬 계수는 실제 게임 데이터의 계산식이 확인되는 경우만 표시한다. 총 AD, 추가 AD, AP를 구분한다.
5. CC는 상대에게 실제로 적용되는 효과만 표시한다. 해제, 면역, 저항, 자기 자신에게 적용되는 효과는 상대 CC로 세지 않는다.
6. 패치가 바뀌면 공식 목록과 스킬 상세를 함께 갱신한다. 이전 패치 설명을 최신처럼 표시하지 않는다.
7. URL, JSON, HTML은 텍스트로 처리한다. HTML을 `innerHTML`로 주입하지 않는다.

NotebookLM 링크는 공개 문서에 넣지 않았다. 작업 폴더의 `private/claude-notebook-context.md`에 사용자가 제공한 링크를 보관했으며, 로그인 화면에서 사용한다. 이 파일은 `private/` 전체와 함께 절대 커밋하지 않는다.

## 파일별 역할

| 파일 | 역할 |
|---|---|
| `index.html` | 사이트 골격, 세 탭, 검색, 역할군·초성 필터, 상세 dialog |
| `app.js` | JSON 로드, 검색/정렬/필터, 카드와 상세 화면 렌더링 |
| `style.css` | 사용자 정의 레이아웃과 롤 테마 |
| `seed.css` | 빌드 때 SEED 기본 토큰으로 복사 |
| `search.js` | 한글 초성 계산 및 가나다순 정렬 |
| `data/catalog.json` | Data Dragon 목록, 이미지, 스킬 원문, 태그·능력치 |
| `data/explanations.json` | 쉬운 설명. 현재 10건은 편집 예시 |
| `data/skill-explanations.json` | 6개 챔피언 Q/W/E/R 편집 설명 |
| `data/skill-details.json` | CommunityDragon 계수·CC 상세 |
| `data/glossary.json` | 초보자용 게임 용어 36건 |
| `data/bot-duos.json` | 봇 듀오 추천·카운터 조합과 운영 설명, 공개 출처 링크 |
| `data/champion-counters.json` | 챔피언별 대표 카운터 3개와 챔피언별 스킬 상호작용을 반영한 초보자용 한 줄 이유, LoLalytics 출처 |
| `scripts/sync.mjs` | Data Dragon 최신 버전과 챔피언/아이템/아이콘 갱신 |
| `scripts/sync-details.mjs` | CommunityDragon에서 계수·CC 상세 생성; 캐시는 `private/` |
| `scripts/skill-details.mjs` | 계산식 파서, CC 패턴, 안전한 미확인 처리 |
| `scripts/enrich-counter-reasons.mjs` | 카운터 챔피언별 스킬 상호작용 문구 생성 |
| `scripts/enrich.mjs` | 쉬운 표현, 챔피언 역할, 아이템 용도 분류 |
| `scripts/import.mjs` | 검수 완료 NotebookLM JSON 병합 |
| `scripts/validate.mjs` | 입력 필드·길이·중복·패치·URL·검수 검사 |
| `scripts/report-missing.mjs` | 현재 패치 기준 쉬운 설명·스킬 설명 누락 보고서 생성 |
| `docs/notebooklm-import.md` | NotebookLM 수집 프롬프트와 JSON 형식 |
| `tests/*.mjs` | 데이터, 검색, 역할, 계수, CC, 이미지 테스트 |
| `.github/workflows/pages.yml` | main push 시 테스트·빌드·GitHub Pages 배포 |

## 새 세션에서 처음 실행

PowerShell에서:

```powershell
Set-Location E:\workspace\lol-guide
npm ci
npm test
npm run build
npm start
```

브라우저에서 `http://127.0.0.1:4173/`을 연다. `npm start`는 `dist`를 정적으로 제공하므로 소스 변경 후에는 다시 `npm run build`한다.

## NotebookLM 자료를 넣는 절차

1. 사용자가 제공한 NotebookLM 노트북에 Google 계정으로 로그인한다. 이전 세션에서는 로그인 화면으로 리디렉션되어 실제 자료를 읽지 못했다. 로그인 우회나 비공개 API 역공학은 하지 않는다.
2. `docs/notebooklm-import.md`의 프롬프트로 챔피언·아이템을 묶음 단위로 요청한다. 답변에 근거 원문, 원문 제목, 공개 출처 URL, 적용 패치를 포함하게 한다.
3. 답변을 로컬 `private/notebooklm.json`에 배열로 저장한다. 이 파일은 `.gitignore`에 의해 공개되지 않는다. 실제 NotebookLM URL을 `sourceUrl`로 쓰지 않는다.
4. 원문과 공식 자료를 대조하고, 길이·조건·대상·수치가 맞는 항목만 `reviewed: true`로 표시한다.
5. 다음을 실행한다.

```powershell
npm run import -- private/notebooklm.json
npm run build
npm test
```

검증 실패 시 `scripts/validate.mjs`의 오류를 수정한다. 검증기는 `evidence`, 임의 필드, 비공개 NotebookLM URL을 공개 데이터에 복사하지 않는다.

쉬운 설명이 빠진 전체 목록과 Claude용 묶음 처리 순서는 `docs/claude-easy-explanations.md`에 있다. 새 세션에서 `npm run report:missing`을 실행하면 현재 패치 기준으로 `private/missing-easy-explanations.md`와 JSON이 생성된다. 복사·붙여넣기용 지시는 `docs/claude-easy-explanations-prompt.md`에 있다.

## 패치 데이터 갱신

```powershell
npm run sync
node scripts/sync-details.mjs
npm run build
npm test
```

`npm run sync`는 Data Dragon 최신 버전을 선택하고 챔피언 상세와 아이콘을 요청한다. `sync-details.mjs`는 CommunityDragon 게임 데이터에서 계산식과 CC를 추출하고, 복잡한 식은 확인 필요로 남긴다. `private/calculations-<major.minor>/` 캐시는 공개하지 않는다. 갱신 후 편집 설명의 `patch`를 새 버전에 맞춰 재검수한다.

## GitHub Pages 배포

원격 저장소는 `https://github.com/sgustjd2/lol-newbi`이고 기본 브랜치는 `main`이다. GitHub Pages Actions가 활성화되어 있으며 공개 주소는 `https://sgustjd2.github.io/lol-newbi/`다. 새 설명을 반영한 뒤 배포가 필요하면 사용자의 요청에 따라 아래처럼 push한다.

```powershell
git add .
git commit -m "Add easy explanations"
git push origin main
```

`.github/workflows/pages.yml`이 테스트·빌드 후 `dist`를 배포한다. Actions 성공 후 공개 주소에서 검색, 상세, 아이콘, 모바일을 확인한다.

공개 전 노트북 주소·인용·로그인 정보가 없는지 확인한다.

```powershell
rg -n "notebook.google.com|notebooklm.google.com|cd627cb8|evidence|private/" --glob "!private/**" --glob "!node_modules/**"
```

노트북 ID가 public-safe 파일에 들어가면 제거한다. `private/`와 `.env*`는 커밋하지 않는다. Riot Games 정책의 제품 등록과 법적 표기를 배포 전에 확인한다.

## 이어서 해야 할 일

1. NotebookLM 로그인 후 챔피언·아이템 실제 설명을 수집하고 사람 검수로 `reviewed`를 관리한다.
2. `formVariant: true`인 24개 스킬(니달리·제이스·레넥사이·엘리스 등)의 두 번째 형태 계수를 CommunityDragon 원본에서 사람이 직접 대조해 채운다. 재시전·반환·다중 적중·대상별 보정도 함께 검수한다. 현재 파서는 첫 번째로 매칭되는 스펠 하나만 계산한다.
3. 패치에서 CommunityDragon 경로가 바뀔 때 매칭 성공률을 확인한다.
4. 아이템 역할 분류를 표본 검수한다. 태그만으로 실제 빌드 의도를 완벽히 알 수 없다.
5. 초보자 5명에게 대표 챔피언·아이템을 보여주고 이해 여부를 확인한다.

## 현재 알려진 제한

- 전체 챔피언의 모든 변신형·조건부 계산식을 완벽히 해석하지 않는다.
- 전체 챔피언·아이템에 사람 검수된 쉬운 설명이 들어간 상태가 아니다.
- 이미지와 글꼴은 외부 CDN을 사용하므로 오프라인에서는 보이지 않을 수 있다.
- Data Dragon·CommunityDragon 패치와 실제 라이브 게임 패치가 다를 수 있다. 화면에 데이터 버전을 표시한다.
- 현재 폴더는 `origin/main`에 연결된 Git 저장소다. 변경 전에 `git status --short --branch`로 다른 세션의 작업을 확인한다.
- SEED CSS 토큰과 기본 CSS는 사용하지만 React 컴포넌트 라이브러리로 마이그레이션한 상태는 아니다. 정적 HTML 구조를 유지한다.

## 새 Claude의 작업 원칙

사용자에게 구현 상태와 데이터 검수 상태를 구분해서 설명한다. NotebookLM에서 가져오지 않은 항목을 가져왔다고 말하지 않는다. 계수나 CC를 추정해서 확정하지 않는다. 수정 후 최소한 `npm test`와 `npm run build`를 실행하고, UI 변경이면 390px 모바일과 상세 dialog를 확인한다. 사용자가 명시하지 않은 결제·로그인 정보 저장·외부 메시지·공개 업로드는 실행하지 않는다.
