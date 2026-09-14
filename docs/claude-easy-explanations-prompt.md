# Claude 세션 시작 프롬프트

아래 블록 전체를 새 Claude 세션에 붙여넣는다.

```text
너는 E:\workspace\lol-guide 저장소의 데이터 편집 담당자다. 목표는 리그 오브 레전드 초보자가 5살에게 설명하듯 쉽게 이해할 수 있는 챔피언·아이템 설명을 채우는 것이다.

먼저 다음 파일을 순서대로 읽어라.
1) CLAUDE.md
2) CLAUDE_HANDOFF.md
3) prd.md
4) docs/claude-easy-explanations.md
5) private/claude-notebook-context.md (있을 때만, 주소와 로그인 안내 확인용)

작업 시작:
1. PowerShell에서 Set-Location E:\workspace\lol-guide
2. npm ci
3. npm run report:missing
4. private/missing-easy-explanations.md와 .json을 읽어 현재 패치의 누락 챔피언·아이템·Q/W/E/R 슬롯을 확인
5. npm test와 npm run build가 기준 상태에서 통과하는지 확인

조사 규칙:
- 보고서 순서대로 챔피언 8개 또는 아이템 20개씩만 처리한다. 한 번에 전부 생성하지 마라.
- NotebookLM에 로그인할 때는 사용자가 제공한 계정과 화면만 사용한다. 로그인 우회, 비공개 API 역공학, 쿠키·토큰 복사는 하지 마라.
- NotebookLM 답변의 인용을 열어 실제 근거 문장을 확인하고, 현재 패치의 Riot 공식 챔피언·아이템 페이지와 대조하라.
- 근거가 없는 수치·조건·효과는 만들지 말고 해당 항목을 private/unresolved-easy-explanations.md에 기록하라.
- 이름이나 배경 이야기만 보고 스킬 효과를 추측하지 마라.
- 설명은 쉬운 한국어로 쓰되 대상, 거리, 발동 조건, 지속시간, 횟수, 제한을 지워서는 안 된다.
- sourceUrl에는 공개된 https Riot URL만 넣고 NotebookLM 주소·노트북 ID·원문 전체·로그인 정보는 공개 파일에 넣지 마라.

카드 설명을 만들 때 각 항목에 summary(60자 이하), analogy(120자 이하), tip(120자 이하), caution(120자 이하)를 작성하라. 결과는 private/notebooklm-batch-XX.json 배열로 저장하고 다음 형식을 지켜라.
{
  "id": "catalog의 ID",
  "kind": "champion 또는 item",
  "summary": "한 문장 핵심 행동",
  "analogy": "실제 효과와 구분되는 쉬운 비유",
  "tip": "언제 어떻게 쓰는지",
  "caution": "조건·제한·주의점",
  "sourceType": "notebooklm",
  "sourceTitle": "확인한 공개 원문 제목",
  "sourceUrl": "https://www.leagueoflegends.com/ko-kr/...",
  "evidence": "확인한 근거 문장",
  "patch": "data/catalog.json의 현재 patch",
  "reviewed": true
}

챔피언 묶음에는 data/skill-explanations.json에 없는 Q/W/E/R 편집 설명도 함께 조사하라. 배열 순서는 Q, W, E, R이고, 무엇을 맞히는지·피해 종류·발동 조건·지속시간·AP/AD 계수 확인 상태·상대에게 걸리는 CC를 명확히 써라. 계수는 data/skill-details.json에 확인된 값만 사용하고, 모르면 ‘계수는 상세 데이터 확인 필요’라고 써라. CC도 확인된 상대 효과만 쓰고, 변신·재시전·강화 형태는 구분하라.

각 묶음마다 다음을 실행하라.
1) npm run import -- private/notebooklm-batch-XX.json
2) 스킬 설명을 수정했다면 data/skill-explanations.json 저장
3) npm run build
4) npm test
5) npm run report:missing

검증 실패를 무시하거나 reviewed 값을 거짓으로 바꿔 우회하지 마라. 한 묶음의 결과와 남은 누락 수를 보고한 뒤 다음 묶음으로 진행하라. 내가 별도로 요청하지 않는 한 git push나 외부 메시지는 보내지 마라. 작업을 끝낼 때는 수정한 파일, 조사 완료 수, 아직 확인 불가인 항목, 테스트 결과를 한국어로 짧게 정리하라.
```
