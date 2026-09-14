# Claude용 쉬운 설명 누락 조사 작업

이 문서는 새 Claude 세션이 현재 저장소에서 쉬운 설명이 없는 챔피언·아이템을 찾아 NotebookLM 자료로 채우는 실행 문서다. 목표는 긴 공식 문장을 그대로 복사하는 것이 아니라, 초보자가 한 번 읽고 **무엇을 하는지·언제 쓰는지·무엇을 조심할지** 알 수 있는 설명을 만드는 것이다.

## 시작 순서

작업 폴더는 `E:\workspace\lol-guide`다. 새 세션에서 다음 파일을 먼저 읽는다.

1. `CLAUDE.md`
2. `CLAUDE_HANDOFF.md`
3. `prd.md`
4. 이 문서
5. `docs/claude-easy-explanations-prompt.md`

그 다음 실행한다.

```powershell
Set-Location E:\workspace\lol-guide
npm ci
npm run report:missing
Get-Content -Raw private/missing-easy-explanations.md
npm test
npm run build
```

`report:missing`은 현재 `data/catalog.json` 패치를 기준으로 보고서를 만든다. 결과는 공개하지 않는 `private/missing-easy-explanations.md`와 `private/missing-easy-explanations.json`에 저장된다. 패치가 바뀌면 보고서를 다시 생성한다.

## 조사 범위와 우선순위

보고서의 `missingChampions`와 `missingItems`가 조사 대상이다. 한 번에 전부 요청하지 말고 다음 묶음으로 처리한다.

- 챔피언: 8개씩, 가나다순
- 아이템: 20개씩, 가나다순
- Q/W/E/R 편집 설명: 챔피언 한 묶음에 포함해 최대 8명씩

각 묶음을 끝낼 때마다 JSON을 저장하고 검사한다. 실패한 항목은 억지로 채우지 말고 `private/unresolved-easy-explanations.md`에 ID와 막힌 이유를 적은 뒤 다음 묶음으로 넘어간다.

## NotebookLM 사용

사용자가 제공한 NotebookLM 주소는 공개 문서에 적지 않았다. 로컬에 있는 `private/claude-notebook-context.md`에서 주소를 확인하고, 해당 Google 계정으로 브라우저에 로그인한 뒤 화면에 보이는 자료만 사용한다. 로그인 우회, 비공개 API 역공학, 쿠키·토큰 복사는 하지 않는다.

NotebookLM에 질문할 때는 반드시 다음을 지킨다.

- 첨부된 자료에 없는 수치·조건·효과는 `확인 불가`로 남긴다.
- 챔피언 이름, 스킨 이름, 배경 이야기로 스킬 효과를 추측하지 않는다.
- 답변의 인용을 열어 원문 제목과 실제 근거 문장을 확인한다.
- `data/catalog.json`의 현재 패치와 Riot 공식 챔피언·아이템 페이지를 대조한다.
- 설명의 핵심 대상, 거리, 발동 조건, 지속시간, 횟수, 제한을 쉬운 말로 보존한다.

## 카드 설명 데이터 형식

NotebookLM에서 검수한 챔피언·아이템은 `private/notebooklm-batch-XX.json`에 배열로 저장한다. ID와 종류는 `data/catalog.json`에서 복사한다.

```json
[
  {
    "id": "Garen",
    "kind": "champion",
    "summary": "가까운 적 옆에서 칼을 휘두르는 튼튼한 전사예요.",
    "analogy": "친구를 지키며 앞에서 맞아주는 큰 방패 병사 같아요.",
    "tip": "적이 가까이 모였을 때 E로 빙글빙글 공격해 보세요.",
    "caution": "멀리 있는 적에게는 가까이 다가가야 공격이 닿아요.",
    "sourceType": "notebooklm",
    "sourceTitle": "실제로 확인한 공개 원문 제목",
    "sourceUrl": "https://www.leagueoflegends.com/ko-kr/champions/garen/",
    "evidence": "NotebookLM 인용과 공식 페이지에서 실제로 확인한 근거 문장",
    "patch": "16.18.1",
    "reviewed": true
  }
]
```

필드 규칙은 다음과 같다.

- `summary`: 60자 이하. 한 문장으로 정체와 핵심 행동을 쓴다.
- `analogy`: 120자 이하. 비유라고 분명히 느껴지게 쓰고 실제 효과와 섞지 않는다.
- `tip`: 120자 이하. 초보자가 언제 어떤 버튼을 누를지 쓴다.
- `caution`: 120자 이하. 사거리·조건·대상·제한 중 중요한 것을 하나 이상 쓴다.
- `sourceType`: 반드시 `notebooklm`.
- `reviewed`: 근거와 패치 확인을 끝낸 경우에만 `true`.
- `sourceUrl`: `https://` 공개 Riot 페이지. NotebookLM URL은 넣지 않는다.
- HTML 태그, 계정 정보, 비공개 인용, 확인하지 않은 숫자는 넣지 않는다.

## 카드 설명 수집용 질문

챔피언 또는 아이템 묶음을 NotebookLM에 넣고, `docs/claude-easy-explanations-prompt.md`의 프롬프트를 그대로 사용한다. 답변이 너무 길면 같은 묶음을 반으로 나눈다. 원문 근거가 없는 항목은 JSON에 넣지 않는다.

## 스킬 Q/W/E/R 설명

챔피언 스킬 편집 설명은 `data/skill-explanations.json`에 다음처럼 챔피언별 4개 문자열을 넣는다.

```json
{
  "patch": "16.18.1",
  "champions": {
    "Garen": [
      "Q 설명...",
      "W 설명...",
      "E 설명...",
      "R 설명..."
    ]
  }
}
```

배열 순서는 반드시 `Q, W, E, R`이다. 각 문장은 다음 내용을 가능하면 포함한다.

- 무엇을 맞히는지와 어떤 피해인지
- 발동 조건과 지속시간·횟수
- AP 계수인지, AD 계수인지, 둘 다인지, 계수 확인이 안 되는지
- 기절·속박·침묵·둔화·공중 띄우기 같은 CC 효과와 상대가 할 수 있는 행동
- 변신·재시전·강화 형태가 있으면 각 형태를 구분

계수는 `data/skill-details.json`의 확인된 값만 사용한다. 확신할 수 없으면 `계수는 상세 데이터 확인 필요`라고 쓰며 0이나 임의의 숫자를 만들지 않는다. CC도 `skill-details.json`에 확인된 상대 효과만 쓴다.

스킬 수집용 질문은 다음 문서를 사용한다.

```text
첨부 자료와 현재 패치의 공식 Riot 자료만 사용해서 아래 챔피언의 Q/W/E/R을 초보자용 한국어로 정리해줘. 각 줄은 버튼 하나에 해당해야 해. 무엇을 대상으로 하는지, 발동 조건, 피해 종류, 지속시간과 제한을 빠뜨리지 말고, AP 계수인지 AD 계수인지 또는 확인 필요인지 명시해줘. 기절·속박·침묵·둔화·공중 띄우기처럼 상대에게 걸리는 CC와 그동안 상대가 할 수 있는 행동도 써줘. 변신·재시전·강화 형태는 형태별로 구분해줘. 확인할 수 없는 내용은 추측하지 말고 ‘확인 불가’로 표시해줘. 비유는 한 문장만 덧붙이고 실제 효과와 섞지 마. 각 스킬마다 확인한 원문 제목과 공개 Riot URL을 함께 적어줘.
```

## 반영과 검증

카드 설명 묶음은 다음 순서로 반영한다.

```powershell
npm run import -- private/notebooklm-batch-XX.json
npm run build
npm test
npm run report:missing
```

`npm run import`가 거부하면 오류 메시지의 ID와 필드를 고친다. 검수되지 않은 NotebookLM 항목을 우회해서 넣지 않는다. 스킬 파일을 수정한 뒤에는 `npm run build`와 `npm test`를 실행한다.

완료를 판단할 때는 다음을 확인한다.

- `private/missing-easy-explanations.md`에서 조사 완료 수가 늘었는가
- 모든 카드 설명이 현재 패치와 일치하는가
- `summary`, `analogy`, `tip`, `caution`이 어린이가 읽어도 이해할 짧은 문장인가
- Q/W/E/R이 순서대로 들어갔고 스킬 이미지와 연결되는가
- 계수와 CC를 추측하지 않았는가
- `rg -n "notebook.google.com|notebooklm.google.com|cd627cb8|evidence|private/" --glob "!private/**" --glob "!node_modules/**"` 결과에 비공개 정보가 없는가

조사할 수 없는 항목은 누락으로 남겨도 된다. 대신 ID, 시도한 자료, 막힌 이유를 `private/unresolved-easy-explanations.md`에 기록해 다음 Claude 세션이 이어서 처리할 수 있게 한다.
