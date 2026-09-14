# 롤 한입

초보자를 위한 한국어 리그 오브 레전드 사전. [요구사항](prd.md), [Claude 인수인계 문서](CLAUDE_HANDOFF.md), [NotebookLM 수집 안내](docs/notebooklm-import.md).

쉬운 설명이 빠진 챔피언·아이템을 조사하려면 [Claude 누락 조사 작업](docs/claude-easy-explanations.md)과 [세션 시작 프롬프트](docs/claude-easy-explanations-prompt.md)를 사용합니다. `npm run report:missing` 명령으로 현재 패치의 누락 목록을 만듭니다.

## 실행
Node.js 22 이상에서 실행합니다. SEED CSS 패키지를 사용합니다.

```sh
npm ci
npm run build
npm start
```

미리보기: http://127.0.0.1:4173. 공식 목록 갱신: `npm run sync`. 아이템 조합만 갱신할 때는 `npm run sync:recipes`를 사용합니다. 검사: `npm test`.

스킬 계수/CC 갱신: 공식 목록 갱신 후 `node scripts/sync-details.mjs`. 같은 패치의 CommunityDragon 게임 데이터를 사용하며 원본 캐시는 git 제외 경로인 private에 저장합니다. 파싱 가능한 계산식만 표시하고 누락은 0으로 취급하지 않습니다. 조건부 효과/다른 형태의 계산식은 추가 확인 대상입니다.

디자인은 @seed-design/css 2.8.1의 토큰을 활용합니다. 흰 배경과 롤에서 착안한 남색·금색·청색 테마를 사용합니다. SEED 라이선스와 NOTICE는 빌드 산출물에 포함합니다.

## 데이터 상태
- 공식 Data Dragon 목록을 저장해 정적으로 제공합니다. 이미지와 글꼴은 외부 CDN을 사용합니다.
- 초기 쉬운 설명 10개는 편집 예시입니다. 실제 NotebookLM 추출은 로그인 후 진행합니다.
- 전체 항목에 쉬운 설명이 완성된 서비스가 아닙니다. 숫자를 확인하려면 화면의 ‘쉬운 설명만’을 사용하세요.
- 전체 챔피언의 Q/W/E/R과 기본 지속 효과를 제공합니다. 6명은 쉬운 편집 설명, 나머지는 공식 설명의 표현 정리 및 용어 풀이입니다. 변신 후 스킬의 추가 형태는 아직 별도로 수집하지 않았습니다.
- 아이템은 공식 태그와 능력치, 아군 지원 효과로 AD/AP/탱커/서포터/공용을 복수 분류합니다. 전용 역할이나 추천 빌드를 의미하지 않습니다.
- 아이템 상세에는 Data Dragon의 하위 재료와 만들 수 있는 상위 아이템을 조합 흐름으로 표시하며, 아이콘을 누르면 해당 아이템 상세로 이동합니다.
- `봇 듀오` 탭에는 2026 시즌 공개 프로 대회 경기 2,057건에서 1경기 이상 등장한 411개 봇·서포터 조합을 전부 모았습니다. S+·S·A·B·C 티어순으로 정렬하고, 각 조합에 초보자용 궁합·운영 방법과 카운터 2개를 제공합니다. 현재 수집 범위는 16.01–16.17이며 패치·지역·표본에 따라 달라지는 참고 자료입니다.
- 버전이 다른 설명은 빌드 시 숨깁니다. 최신 자료 버전과 실제 라이브 패치는 다를 수 있습니다.

## GitHub Pages
1. 원격 저장소는 `https://github.com/sgustjd2/lol-newbi`입니다.
2. `main`에 push하면 `.github/workflows/pages.yml`이 테스트·빌드 후 자동 배포합니다.
3. 공개 주소는 `https://sgustjd2.github.io/lol-newbi/`입니다.

공개 산출물은 `dist`뿐입니다. `private`는 git에서 제외되며 빌드에 복사되지 않습니다. 노트북 자체를 공개할 필요가 없습니다. 현재 원격 저장소와 Pages 배포가 설정되어 있습니다.

공개 서비스 출시 전에 [Riot 개발자 정책](https://developer.riotgames.com/docs/lol)을 확인하고 제품 등록 절차를 진행합니다.
