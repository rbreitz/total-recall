"""
Capture step: parse outputs/session*.txt into web/data/sessions.json.

The run_session_*.py scripts write each transcript as:

    === SESSION 1 ===
    Question: <the test question>

    --- ANSWER ---
    <the agent's answer>

This reads every outputs/session*.txt and emits:

    [{ "n", "title", "question", "answer" }]

Usage:
    python web/parse_outputs.py
"""

import json
import re
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parent.parent
OUTPUTS_DIR = REPO_ROOT / "outputs"
DATA_DIR = Path(__file__).resolve().parent / "data"

TITLES = {
    1: "Baseline — first prep call",
    2: "After memory + new context",
    3: "Adversarial reconcile",
}


def parse_one(path: Path) -> dict | None:
    text = path.read_text(encoding="utf-8", errors="replace")
    m = re.search(r"session(\d+)", path.stem)
    if not m:
        return None
    n = int(m.group(1))

    question = ""
    qm = re.search(r"^Question:\s*(.*?)\n\n", text, re.S | re.M)
    if qm:
        question = qm.group(1).strip()

    answer = text
    if "--- ANSWER ---" in text:
        answer = text.split("--- ANSWER ---", 1)[1].strip()

    return {
        "n": n,
        "title": TITLES.get(n, f"Session {n}"),
        "question": question,
        "answer": answer,
    }


def main() -> None:
    if not OUTPUTS_DIR.exists():
        raise SystemExit(f"No {OUTPUTS_DIR}/ — run the sessions first.")

    sessions = []
    for path in sorted(OUTPUTS_DIR.glob("session*.txt")):
        parsed = parse_one(path)
        if parsed:
            sessions.append(parsed)
    sessions.sort(key=lambda s: s["n"])

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    out = DATA_DIR / "sessions.json"
    out.write_text(json.dumps(sessions, indent=2))
    print(f"Wrote {len(sessions)} sessions to {out}")


if __name__ == "__main__":
    main()
