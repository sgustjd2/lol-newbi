# NotebookLM 수집 안내

현재 로그인 전이므로 실제 노트북에서 가져온 데이터는 0건입니다. `data/explanations.json`의 초기 10건은 공식 데이터 기반 편집 예시입니다.

## 수집
로그인한 노트북에서 챔피언/아이템을 소규모 묶음으로 요청합니다. 첨부 소스에 없는 내용은 추측하지 않고 누락으로 남깁니다. 답변의 인용을 열어 실제 원문과 비교합니다. NotebookLM의 전체 소스, 노트북 주소, 로그인 정보는 저장소에 넣지 않습니다.

프롬프트:
> 첨부된 자료만 사용해서 [챔피언/아이템 이름]을 정리해줘. 한 줄 설명(60자), 쉬운 비유(120자), 실제 사용 팁(120자), 주의점(120자)을 한국어로 써줘. 비유와 실제 효과를 구분하고 조건이나 대상을 생략하지 마. 각 항목에 근거 원문, 원문 제목, 공개 출처 URL, 설명이 적용되는 패치를 표시해줘. 알 수 없는 것은 확인 불가로 남겨줘. 챔피언의 이름과 배경 이야기만으로 스킬 효과를 추측하지 마.

응답을 `private/notebooklm.json`에 다음 형식의 배열로 저장합니다. 원문 비교와 패치 확인을 마친 뒤에만 `reviewed`를 true로 바꿉니다. ID는 `data/catalog.json`에서 확인합니다.

```json
[
  {
    "id": "Garen",
    "kind": "champion",
    "summary": "수집 후 작성",
    "analogy": "수집 후 작성",
    "tip": "수집 후 작성",
    "caution": "수집 후 작성",
    "sourceType": "notebooklm",
    "sourceTitle": "실제 확인한 원문 제목",
    "sourceUrl": "https://www.leagueoflegends.com/ko-kr/champions/garen/",
    "evidence": "실제로 확인한 근거 문장",
    "patch": "16.18.1",
    "reviewed": false
  }
]
```

`npm run import -- private/notebooklm.json`은 길이, ID, 중복, 패치, 검수, 출처를 검사합니다. 원문 근거와 추가 필드는 공개 데이터에서 제거합니다. `npm run build` 후 반영됩니다. 가져오기 스크립트는 AI 답변의 사실성을 판단하지 않으므로 검수자가 실제 내용을 확인해야 합니다. 패치 변경 시 이전 설명은 숨겨지며 재검수 후에만 다시 표시됩니다.
