from __future__ import annotations

import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parents[1]
REPORT_PATH = ROOT / "reports" / "qa_report.md"

EXPECTED_NAV = [
    "ホーム",
    "地域の販売店",
    "農家と出会う",
    "地域に根差した野菜を見る",
    "農家さんへ",
    "地域で使う",
    "マイページ",
    "この活動について",
]

REQUIRED_HTML = [
    "index.html",
    "places.html",
    "farmers.html",
    "farmer.html",
    "seeds.html",
    "for-farmers.html",
    "profile-input.html",
    "profile-interview.html",
    "business.html",
    "municipality.html",
    "farmer-network.html",
    "mypage.html",
    "about.html",
    "map.html",
]

REQUIRED_JSON = [
    "data/farmers.json",
    "data/places.json",
    "data/seeds.json",
]

BAD_TERMS = [
    "無農薬",
    "安心安全",
    "完全無農薬",
    "AIが安全性を保証する",
    "AIが良い農家を判定する",
    "AIが農法の優劣を決める",
    "ポイントが付与されます",
    "ポイントを付与しました",
    "決済できます",
    "決済しました",
    "問い合わせを送信しました",
    "メールを送信しました",
    "AIが生成しました",
]

ALLOWED_BAD_TERM_SNIPPETS = [
    "無農薬で安心安全な野菜です",
    "「無農薬」という表現は、掲載時には慎重に扱う必要があります",
    "「安心安全」は受け取り方に個人差があるため",
]

ALLOWED_SOURCE_TYPES = {
    "public_database",
    "local_material",
    "farmer_verified",
    "research_needed",
}


@dataclass
class Finding:
    level: str
    message: str


findings: list[Finding] = []


def add_error(message: str) -> None:
    findings.append(Finding("ERROR", message))


def add_warning(message: str) -> None:
    findings.append(Finding("WARN", message))


def add_info(message: str) -> None:
    findings.append(Finding("INFO", message))


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def load_json(path: Path):
    try:
        return json.loads(read_text(path))
    except Exception as exc:  # noqa: BLE001 - CLI report should keep going.
        add_error(f"{path.relative_to(ROOT)}: JSON parse failed: {exc}")
        return None


def check_required_files() -> None:
    for relative in REQUIRED_HTML + REQUIRED_JSON + ["css/styles.css", "js/main.js", "functions/api/profile-draft.js"]:
        path = ROOT / relative
        if not path.exists():
            add_error(f"Missing required file: {relative}")
        else:
            add_info(f"Found: {relative}")


def extract_nav_labels(html: str) -> list[str]:
    nav_match = re.search(r'<nav class="(?:main-nav|site-nav)"[\s\S]*?</nav>', html)
    if not nav_match:
        return []
    return [match.group(1).strip() for match in re.finditer(r"<a [^>]*>([^<]+)</a>", nav_match.group(0))]


def check_nav() -> None:
    for relative in REQUIRED_HTML:
        path = ROOT / relative
        if not path.exists():
            continue
        labels = extract_nav_labels(read_text(path))
        if labels != EXPECTED_NAV:
            add_error(f"{relative}: nav order mismatch: {' | '.join(labels)}")
        else:
            add_info(f"{relative}: nav OK")


def is_external_or_anchor(value: str) -> bool:
    value = value.strip()
    if not value or value.startswith("#"):
        return True
    parsed = urlsplit(value)
    if parsed.scheme in {"http", "https", "mailto", "tel", "javascript", "data", "app"}:
        return True
    return False


def check_local_references() -> None:
    attr_pattern = re.compile(r"""(?:href|src)=["']([^"']+)["']""", re.IGNORECASE)
    for path in sorted(ROOT.glob("*.html")):
        html = read_text(path)
        for match in attr_pattern.finditer(html):
            raw = match.group(1).strip()
            if is_external_or_anchor(raw):
                continue
            target_raw = raw.split("?", 1)[0].split("#", 1)[0]
            target = (path.parent / target_raw).resolve()
            try:
                target.relative_to(ROOT)
            except ValueError:
                add_error(f"{path.name}: reference escapes project root: {raw}")
                continue
            if not target.exists():
                add_error(f"{path.name}: missing referenced file: {raw}")
    add_info("Local href/src reference check completed")


def check_dangerous_terms() -> None:
    targets = list(ROOT.glob("*.html")) + list((ROOT / "data").glob("*.json")) + [ROOT / "js" / "main.js"]
    for path in targets:
        text = read_text(path)
        for term in BAD_TERMS:
            start = 0
            while True:
                index = text.find(term, start)
                if index == -1:
                    break
                context = text[max(0, index - 40): index + len(term) + 60]
                if any(snippet in context for snippet in ALLOWED_BAD_TERM_SNIPPETS):
                    add_info(f"{path.relative_to(ROOT)}: allowed example contains '{term}'")
                else:
                    add_warning(f"{path.relative_to(ROOT)}: check expression '{term}' near: {context.strip()}")
                start = index + len(term)


def check_openai_key_scope() -> None:
    forbidden_targets = list(ROOT.glob("*.html")) + [ROOT / "js" / "main.js"]
    for path in forbidden_targets:
        if not path.exists():
            continue
        text = read_text(path)
        if "OPENAI_API_KEY" in text:
            add_error(f"{path.relative_to(ROOT)}: OPENAI_API_KEY must not be exposed to the browser")

    function_path = ROOT / "functions" / "api" / "profile-draft.js"
    if function_path.exists():
        function_text = read_text(function_path)
        if "context.env" not in function_text or "OPENAI_API_KEY" not in function_text:
            add_warning("functions/api/profile-draft.js: OPENAI_API_KEY lookup via context.env not found")

    text_suffixes = {".html", ".js", ".json", ".md", ".py", ".css"}
    for path in ROOT.rglob("*"):
        if not path.is_file() or path.suffix not in text_suffixes:
            continue
        if ".git" in path.parts:
            continue
        text = read_text(path)
        if re.search(r"sk-[A-Za-z0-9_-]{8,}", text):
            add_error(f"{path.relative_to(ROOT)}: possible OpenAI API key literal found")

    for path in [ROOT / "functions" / "api" / "profile-draft.js", ROOT / "js" / "main.js"]:
        if path.exists() and "console.log" in read_text(path):
            add_warning(f"{path.relative_to(ROOT)}: console.log found; ensure secrets are not logged")


def check_data() -> None:
    farmers = load_json(ROOT / "data" / "farmers.json")
    places = load_json(ROOT / "data" / "places.json")
    seeds = load_json(ROOT / "data" / "seeds.json")

    if isinstance(farmers, list):
        if len(farmers) != 2:
            add_error(f"data/farmers.json: expected 2 items, got {len(farmers)}")
        ids = {item.get("id") for item in farmers if isinstance(item, dict)}
        for required_id in {"yamada-nouen", "model-shizen-nouen"}:
            if required_id not in ids:
                add_error(f"data/farmers.json: missing farmer id {required_id}")
        add_info(f"data/farmers.json count: {len(farmers)}")

    if isinstance(places, list):
        if len(places) != 3:
            add_error(f"data/places.json: expected 3 items, got {len(places)}")
        add_info(f"data/places.json count: {len(places)}")

    if isinstance(seeds, list):
        if len(seeds) != 9:
            add_error(f"data/seeds.json: expected 9 items, got {len(seeds)}")
        for index, seed in enumerate(seeds, start=1):
            if not isinstance(seed, dict):
                add_error(f"data/seeds.json item {index}: must be an object")
                continue
            seed_id = seed.get("id", f"item {index}")
            for key in ["lat", "lng"]:
                value = seed.get(key)
                if not isinstance(value, (int, float)):
                    add_error(f"data/seeds.json {seed_id}: missing numeric {key}")
            source_type = seed.get("sourceType")
            if source_type not in ALLOWED_SOURCE_TYPES:
                add_error(f"data/seeds.json {seed_id}: invalid sourceType {source_type!r}")
        add_info(f"data/seeds.json count: {len(seeds)}")

    js_text = read_text(ROOT / "js" / "main.js") if (ROOT / "js" / "main.js").exists() else ""
    if '"model-nouen": "model-shizen-nouen"' not in js_text:
        add_warning("js/main.js: farmer alias model-nouen -> model-shizen-nouen not found")
    else:
        add_info("farmer.html?id=model-nouen alias found")


def write_report() -> None:
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    errors = [item for item in findings if item.level == "ERROR"]
    warnings = [item for item in findings if item.level == "WARN"]

    lines = [
        "# QA Report",
        "",
        "Generated by `python tools/qa_check.py`.",
        "",
        "## Summary",
        "",
        f"- Errors: {len(errors)}",
        f"- Warnings: {len(warnings)}",
        f"- Total findings: {len(findings)}",
        "",
        "## Findings",
        "",
    ]
    for finding in findings:
        lines.append(f"- **{finding.level}**: {finding.message}")
    lines.append("")
    REPORT_PATH.write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    check_required_files()
    check_nav()
    check_local_references()
    check_data()
    check_dangerous_terms()
    check_openai_key_scope()
    write_report()

    errors = [item for item in findings if item.level == "ERROR"]
    warnings = [item for item in findings if item.level == "WARN"]

    print("QA check completed")
    print(f"Errors: {len(errors)}")
    print(f"Warnings: {len(warnings)}")
    print(f"Report: {REPORT_PATH.relative_to(ROOT)}")
    if errors:
        for item in errors:
            print(f"ERROR: {item.message}")
        return 1
    if warnings:
        for item in warnings:
            print(f"WARN: {item.message}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
