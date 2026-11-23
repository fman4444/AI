# -*- coding: utf-8 -*-
"""파일 검사 스크립트 — PR마다 실행합니다(이 수업에서 CI 역할).

실행: python tests/run_acceptance.py
결과: 검사마다 통과 / 실패 / 미실행과 이유를 표로 보여 줍니다. 실패가 하나라도 있으면 끝 코드 1.

이 스크립트는 **파일만** 봅니다. 화면 동작(수용 기준 AC1~AC4·AC6)은 사람이 브랜치 ZIP이나
배포 주소에서 tests/acceptance.md 순서대로 확인합니다.

④ 검증·데이터 담당은 아래 두 설정만 docs/design.md 1·2절과 같게 채웁니다. 검사 함수는 고치지 않습니다.
- 아직 없는 파일은 실패가 아니라 '미실행 — 파일 없음'으로 보고합니다.
- 확인을 지우거나 기준을 낮춰서 통과시키지 않습니다.
- 표준 라이브러리만 씁니다(추가 설치 없음).
"""
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
TOOLS = ROOT / "tools"

# ---- ④가 채우는 설정 (docs/design.md와 같게) -------------------------------
PAGES = [
    # "tools/index.html",
    # "tools/pages/{기능A 영문}.html",
    # "tools/pages/{기능B 영문}.html",
]
COMMON_FILES = ["tools/assets/common.js", "tools/assets/style.css"]
STORAGE_KEY = ""  # 예) "team3_app" — design.md 2절


# ---- 검사 ------------------------------------------------------------------
# 각 함수는 (결과, 이유)를 돌려준다. 결과 = True(통과) / False(실패) / None(미실행)

def _web_files():
    return [p for p in TOOLS.rglob("*") if p.is_file() and p.suffix.lower() in (".html", ".js", ".css")]


def _read(p):
    return p.read_text(encoding="utf-8", errors="ignore")


def ac5_no_external_send():
    """AC5 데이터를 외부로 보내지 않는다 — 결과물 파일에 외부 주소·외부 요청이 없는지 본다."""
    targets = [p for p in TOOLS.rglob("*") if p.is_file()] + \
              [p for p in (ROOT / "scripts").rglob("*") if p.is_file()]
    if not [p for p in targets if p.name != ".gitkeep"]:
        return None, "tools/에 아직 파일 없음"
    hits = []
    for p in targets:
        text = _read(p)
        for word in ("http://", "https://", "fetch(", "XML" + "HttpRequest", "requests."):   # 문자열을 나눠 둔다(자료 금지어 검사와 겹치지 않게)
            if word in text:
                hits.append(f"{p.relative_to(ROOT).as_posix()}: {word}")
    return not hits, "외부 전송 흔적 없음" if not hits else "; ".join(hits[:3])


def f1_files_exist():
    """F1 design.md 1절의 페이지·공통 파일이 모두 있다."""
    if not PAGES:
        return None, "PAGES를 아직 채우지 않음(④가 design.md 1절과 같게)"
    missing = [f for f in PAGES + COMMON_FILES if not (ROOT / f).is_file()]
    if missing:
        # 아직 병합되지 않은 페이지가 있는 동안은 실패가 아니라 미실행 — 통합 뒤(1차 시험)에는 모두 있어야 한다
        return None, "아직 없음(해당 PR 병합 전이면 정상): " + ", ".join(missing)
    return True, "모두 있음"


def f2_no_module_file():
    """F2 type="module" 스크립트 파일이 없다(더블클릭으로 열면 동작하지 않음)."""
    files = [p for p in _web_files() if p.suffix.lower() == ".html"]
    if not files:
        return None, "미실행 — 파일 없음"
    pat = re.compile(r"<script[^>]*type\s*=\s*[\"']module[\"'][^>]*\ssrc\s*=|<script[^>]*\ssrc\s*=[^>]*type\s*=\s*[\"']module[\"']", re.I)
    hits = [p.relative_to(ROOT).as_posix() for p in files if pat.search(_read(p))]
    return not hits, "없음" if not hits else "있음: " + ", ".join(hits)


def f3_links():
    """F3 모든 페이지가 assets/common.js를 불러오고, 페이지 사이 상대 링크가 실제 파일을 가리킨다."""
    pages = [ROOT / f for f in PAGES if (ROOT / f).is_file()]
    if not pages:
        return None, "미실행 — 파일 없음"
    probs, pending = [], []
    planned = {(ROOT / f).resolve() for f in PAGES + COMMON_FILES}
    for p in pages:
        t = _read(p)
        if not re.search(r"<script[^>]*src\s*=\s*[\"'][^\"']*assets/common\.js", t, re.I):
            probs.append(f"{p.relative_to(ROOT).as_posix()}: common.js 안 부름")
        for href in re.findall(r"(?:href|src)\s*=\s*[\"']([^\"'#?]+)", t, re.I):
            if re.match(r"^[a-z]+:", href, re.I):
                continue
            target = (p.parent / href).resolve()
            if target.is_file():
                continue
            if target in planned:
                pending.append(href)   # design.md에 있는 페이지 — 아직 병합 전
            else:
                probs.append(f"{p.relative_to(ROOT).as_posix()} → {href} 없음")
    if probs:
        return False, "; ".join(probs[:4])
    if pending:
        return None, "링크한 페이지가 아직 없음(병합 전이면 정상): " + ", ".join(sorted(set(pending)))
    return True, "모두 맞음"


def f4_storage_key():
    """F4 localStorage 키 이름이 design.md 2절과 같다(common.js에 그 키가 있고, 다른 키는 없다)."""
    if not STORAGE_KEY:
        return None, "STORAGE_KEY를 아직 채우지 않음(④가 design.md 2절과 같게)"
    common = ROOT / "tools/assets/common.js"
    if not common.is_file():
        return None, "미실행 — common.js 없음"
    design = _read(ROOT / "docs/design.md") if (ROOT / "docs/design.md").is_file() else ""
    if STORAGE_KEY not in design:
        return False, f"design.md에 '{STORAGE_KEY}' 없음"
    if STORAGE_KEY not in _read(common):
        return False, f"common.js에 '{STORAGE_KEY}' 없음"
    others = [p.relative_to(ROOT).as_posix() for p in _web_files()
              if p != common and re.search(r"localStorage\s*\.\s*(getItem|setItem|removeItem)", _read(p))]
    return not others, "키 일치, 저장소는 common.js에서만 씀" if not others else "common.js 밖에서 저장소 직접 사용: " + ", ".join(others)


CHECKS = [
    ("AC5", ac5_no_external_send),
    ("F1", f1_files_exist),
    ("F2", f2_no_module_file),
    ("F3", f3_links),
    ("F4", f4_storage_key),
]


def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:  # noqa: BLE001
        pass
    failed = 0
    print("| 검사 | 결과 | 이유 |\n|---|---|---|")
    for name, fn in CHECKS:
        try:
            ok, why = fn()
        except Exception as e:  # noqa: BLE001 — 확인 중 오류는 실패로 본다
            ok, why = False, f"오류: {e}"
        label = "미실행" if ok is None else ("통과" if ok else "실패")
        failed += ok is False
        print(f"| {name} | {label} | {why} |")
    print(f"\n실패 {failed}건 — PR 본문 '검증 결과'에 이 표를 붙여 넣습니다. 화면 확인(AC1~AC4·AC6)은 사람이 따로 적습니다.")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
