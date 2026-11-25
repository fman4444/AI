# 설계 메모 — 2G조 주 4.5일제 근무 현황 점검

> 팀 PRD ② 블록에서 작성(드라이버 세션, team_plan과 함께) · 목적은 둘 — **두 사람이 같은 파일을 동시에 고치지 않게** 경계를 정하고, **페이지끼리 주고받는 데이터 약속**을 먼저 고정하는 것. 길게 쓰지 않습니다.
> `[가정]`은 조원이 정하지 않아 세션이 정한 것이며 `docs/team_decisions.md`에도 있습니다.

## 1. 페이지 지도와 파일 경계

| 역할 | 페이지·하는 일 | 담당 파일 (이 사람만 고친다) | 읽기만 하는 파일 |
|---|---|---|---|
| ① 통합·화면 | 시작 페이지 — 메뉴, 저장된 데이터 요약(부서원 수·근태 입력 건수·대상 금요일), 표본·백업 가져오기, 백업 내보내기, 비우기 | `tools/index.html`, `tools/assets/common.js`, `tools/assets/style.css`, `README.md`, `docs/demo_script.md` | ②·③의 파일 |
| ② 기능 A | 근태 입력(`IN`) — 가상 사번을 고르고 대상 금요일의 부재 유형·부재 시간을 입력 → 저장 | `tools/pages/IN.html`, `tools/assets/IN.js` | `common.js`, `style.css`, `data/` |
| ③ 기능 B | 충족 현황(`board`) — 개인별 달성, 부서별 충족 판정, 미입력자 목록, 확인 필요(중복 입력) 목록 | `tools/pages/board.html`, `tools/assets/board.js` | `common.js`, `style.css`, `data/` |
| ④ 검증·데이터 | — | `data/team_sample.json`, `tests/acceptance.md`, `tests/run_acceptance.py` | ①②③의 파일 |

- 페이지에만 쓰는 스타일은 그 페이지 html의 `<style>`에 둡니다. `style.css`는 ①만 고칩니다.
- `IN`은 대문자 파일 이름입니다. Pages 주소는 대소문자를 구분하므로 링크도 `pages/IN.html`로 정확히 씁니다. [가정]

`CLAUDE.md` '파일 분담' 표도 이 표와 같게 맞춥니다(작업 계획 PR에서).

## 2. 데이터 약속

- localStorage 키: `team2g_app` (이 키 하나만 씁니다 — 같은 PC 브라우저의 다른 웹앱과 섞이지 않게)
- 저장하는 JSON 모양:

| 칸 이름 | 뜻 | 형식 | 쓰는 페이지 | 읽는 페이지 |
|---|---|---|---|---|
| `targetFriday` | 판정 대상 금요일 | 문자열 `"YYYY-MM-DD"` | ① 시작(표본·백업 가져오기) | ② IN, ③ board, ① 시작 |
| `members` | 부서원 명단 | 배열, 한 건 = `{id, dept, trainee}` — `id` 가상 사번(문자열), `dept` 가상 부서명, `trainee` 교육대상자면 `true` | ① 시작(표본·백업 가져오기) | ② IN(사번 선택 목록), ③ board, ① 시작 |
| `attendance` | 금요일 근태 입력 | 배열, 한 건 = `{id, date, absentType, absentHours}` — `absentType`은 `"없음"`·`"휴가"`·`"출장"` 중 하나, `absentHours`는 0~8 숫자 | ② IN(입력·수정), ① 시작(가져오기) | ③ board, ① 시작(건수) |

- ②는 `loadData()`로 전체를 읽어 `attendance`만 바꾼 뒤 `saveData()`로 통째로 씁니다. 다른 칸은 건드리지 않습니다.
- `IN`에서 같은 사번·같은 날짜를 다시 저장하면 기존 건을 고칩니다(새 건을 더하지 않음). [가정]
- 예시 1건:

```json
{"targetFriday":"2026-11-27","members":[{"id":"M001","dept":"가상1부","trainee":false}],"attendance":[{"id":"M001","date":"2026-11-27","absentType":"휴가","absentHours":4}]}
```

- 판정 규칙(③이 `board.js`에서 계산, ④는 같은 규칙으로 기대값을 미리 셉니다 — `prd/team_prd.md` 3절)
  - 평가대상자 = 부서원 중 `trainee`가 `false`인 사람
  - 개인 달성 = `absentType`이 휴가·출장이고 `absentHours`가 4 이상
  - 부서 충족 = 달성한 평가대상자 수 ÷ 평가대상자 수가 50% 이상
  - 근태를 입력하지 않은 평가대상자는 분모에 넣고 달성으로 세지 않으며, 미입력자 목록에 보입니다. [가정]
  - 같은 사번·같은 날짜가 두 건 이상이면 "확인 필요 — 중복 입력"으로 따로 보이고, 달성 판정과 미입력자 목록에서 뺍니다. 분모에는 남깁니다. [가정]
  - 모든 판정 옆에 "담당 검토 후 확정"을 씁니다.
- 표본 파일: `data/team_sample.json` (가상, UTF-8) — 위 JSON 모양과 같고, 시작 페이지 '가져오기'로 불러옵니다.
- 일부러 넣은 함정: 같은 사번·같은 금요일의 근태 2건(중복 입력) 1개 — `data/team_sample.json` 37·38줄(사번 M17). 수용 기준표 AC4에 반영합니다.
- 경계값이 들어 있는 줄: 부재 정확히 4시간(25·29·37·39줄), 4시간 바로 아래 3.5시간(26줄). 표본은 부서원 18명(교육대상자 3명)·근태 16건입니다.

## 3. 공통 함수 (`tools/assets/common.js`, ①이 뼈대 PR에서 고정)

| 함수 | 넣는 것 | 돌려주는 것 · 하는 일 |
|---|---|---|
| `loadData()` | — | 2절 키의 JSON 전체. 없거나 깨졌으면 빈 모양 `{"targetFriday":"","members":[],"attendance":[]}` |
| `saveData(data)` | JSON 전체 | 2절 키에 통째로 저장. 성공하면 `true`, 저장소를 쓸 수 없으면 `false` |
| `exportJson()` | — | 현재 JSON 전체를 `team2g_backup.json` 파일로 내려받기 |
| `importJson(file)` | 백업 또는 표본 파일(`File`) | 파일을 읽어 2절 모양(`members`·`attendance`가 배열)인지 확인한 뒤 `saveData`. Promise로 `{ok, message}`를 돌려줌. 모양이 틀리면 저장하지 않고 `ok:false` |
| `clearData()` | — | 2절 키 지우기('비우기') |

모든 페이지는 이 함수로만 저장소를 씁니다. 그 밖의 함수(판정 계산, 입력 확인, 화면 그리기 등)는 각 페이지 js에 둡니다.

## 4. 여는 방법

- 배포: GitHub Pages `https://lh-axcamp.github.io/W02C03-team2G/tools/index.html` — 실제 저장소 `LH-AXCamp/W02C03-team2G` 기준(조원 결정). 레포 이름의 대소문자를 그대로 씁니다.
- 병합 전 확인: 브랜치 **Code → Download ZIP** → 압축을 풀고 `tools/index.html` 더블클릭
- 파일 검사: `python tests/run_acceptance.py`
