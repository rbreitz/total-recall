"""
Capture step for the web visualizer: dump the current memory store to JSON.

Run this BETWEEN sessions so each file is a frozen point-in-time snapshot:

    run_session_1  ->  python web/snapshot_memory.py 1
    run_session_2  ->  python web/snapshot_memory.py 2

Writes web/data/memory_s<N>.json:  [{ "path", "content", "char_count" }]

The list/retrieve loop is lifted straight out of inspect_memory.py. We also
inject `truststore` so the Anthropic API is reachable behind corporate TLS
inspection (the same fix skill_studio uses) — without it the SDK raises an
opaque APIConnectionError on managed networks.

Usage:
    python web/snapshot_memory.py 1                  # default customer store
    python web/snapshot_memory.py 2 --customer globex
"""

import argparse
import json
import os
from pathlib import Path

# Make the Anthropic API reachable behind corporate TLS inspection.
try:
    import truststore

    truststore.inject_into_ssl()
except ImportError:
    pass

try:
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:
    pass

from anthropic import Anthropic


REPO_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = Path(__file__).resolve().parent / "data"


def resolve_store_id(customer: str | None) -> str:
    """Per-customer store file (S5) if given, else the default store id."""
    if customer:
        p = REPO_ROOT / f".memory_store_{customer.lower()}"
        if not p.exists():
            raise SystemExit(
                f"Missing {p.name}. Run create_agent.py --customer {customer} first."
            )
        return p.read_text().strip()
    p = REPO_ROOT / ".memory_store_id"
    if not p.exists():
        raise SystemExit("Missing .memory_store_id. Run create_agent.py first.")
    return p.read_text().strip()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Snapshot the memory store to JSON for the web visualizer."
    )
    parser.add_argument("n", help="Session number / label, e.g. 1, 2, 3.")
    parser.add_argument(
        "--customer", default=None, help="Per-tenant store to snapshot (S5)."
    )
    args = parser.parse_args()

    if not os.environ.get("ANTHROPIC_API_KEY"):
        raise SystemExit("Set ANTHROPIC_API_KEY (or put it in .env) before running.")

    store_id = resolve_store_id(args.customer)
    client = Anthropic()

    print(f"Snapshotting memory store {store_id} -> memory_s{args.n}.json")
    page = client.beta.memory_stores.memories.list(
        store_id, path_prefix="/", order_by="path"
    )

    files = []
    for item in page.data:
        if item.type != "memory":  # skip directories
            continue
        retrieved = client.beta.memory_stores.memories.retrieve(
            item.id, memory_store_id=store_id
        )
        content = retrieved.content or ""
        files.append(
            {"path": item.path, "content": content, "char_count": len(content)}
        )

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    out = DATA_DIR / f"memory_s{args.n}.json"
    out.write_text(json.dumps(files, indent=2))
    print(f"Wrote {len(files)} memories to {out}")


if __name__ == "__main__":
    main()
