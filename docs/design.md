# 설계 메모 — {조}조 {웹앱 이름}

> 팀 PRD ② 블록에서 작성(드라이버 세션, team_plan과 함께) · 목적은 둘 — **두 사람이 같은 파일을 동시에 고치지 않게** 경계를 정하고, **페이지끼리 주고받는 데이터 약속**을 먼저 고정하는 것. 길게 쓰지 않습니다.

## 1. 페이지 지도와 파일 경계

| 역할 | 페이지·하는 일 | 담당 파일 (이 사람만 고친다) | 읽기만 하는 파일 |
|---|---|---|---|
| ① 통합·화면 | 시작 페이지 — 메뉴, 저장된 데이터 요약, 백업 내보내기·가져오기, 비우기 | `tools/index.html`, `tools/assets/common.js`, `tools/assets/style.css`, `README.md`, `docs/demo_script.md` | ②·③의 파일 |
| ② 기능 A | {페이지 이름} — {하는 일, 예) 표본 붙여 넣기 → 목록} | `tools/pages/{기능A 영문}.html`, `tools/assets/{기능A 영문}.js` | `common.js`, `data/` |
| ③ 기능 B | {페이지 이름} — {하는 일, 예) 기한·서류 확인 → 결과 표} | `tools/pages/{기능B 영문}.html`, `tools/assets/{기능B 영문}.js` | `common.js`, `data/` |
| ④ 검증·데이터 | — | `data/team_sample.*`, `tests/acceptance.md`, `tests/run_acceptance.py` | ①②③의 파일 |

`CLAUDE.md` '파일 분담' 표도 이 표와 같게 맞춥니다(작업 계획 PR에서).

## 2. 데이터 약속

- localStorage 키: `team{조 번호}_app` (이 키 하나만 씁니다 — 같은 PC 브라우저의 다른 웹앱과 섞이지 않게)
- 저장하는 JSON 모양:

| 칸 이름 | 뜻 | 형식 | 쓰는 페이지 | 읽는 페이지 |
|---|---|---|---|---|
| {예) items} | {예) 접수 목록} | {예) 배열, 한 건 = {no, date, status}} | {예) ② 기능 A} | {예) ③ 기능 B, ① 시작} |
| {칸} | {뜻} | {형식} | {페이지} | {페이지} |

- 예시 1건: {예) {"items":[{"no":"A-0001","date":"2026-11-02","status":"접수"}]}}
- 표본 파일: `data/team_sample.{csv | json}` (가상, UTF-8) — {열 또는 칸 설명}
- 일부러 넣은 함정: {위치와 종류 — ④만 미리 앎, 수용 기준표에 반영}

## 3. 공통 함수 (`tools/assets/common.js`, ①이 뼈대 PR에서 고정)

| 함수 | 넣는 것 | 돌려주는 것 · 하는 일 |
|---|---|---|
| `loadData()` | — | 2절 키의 JSON 전체(없으면 빈 모양) |
| `saveData(data)` | JSON 전체 | 2절 키에 통째로 저장 |
| `exportJson()` | — | JSON 백업 파일 내려받기 |
| `importJson(file)` | 백업 파일 | 읽어서 `saveData` |
| `clearData()` | — | 2절 키 지우기('비우기') |

모든 페이지는 이 함수로만 저장소를 씁니다. 그 밖의 함수는 각 페이지 js에 둡니다.

## 4. 여는 방법

- 배포: GitHub Pages `https://{조직}.github.io/{팀 레포 이름}/tools/index.html`
- 병합 전 확인: 브랜치 **Code → Download ZIP** → 압축을 풀고 `tools/index.html` 더블클릭
- 파일 검사: `python tests/run_acceptance.py`
