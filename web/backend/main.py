"""
FastAPI backend for the Memory Agent visualizer.

Serves the captured JSON in web/data/ and computes memory diffs on the fly
(the S8 "memory diff view" headline). No live agent calls — replay only, so the
demo never depends on the network.

Endpoints:
    GET /api/sessions            -> session list + answers
    GET /api/memory/{n}          -> memory snapshot for session n
    GET /api/diff?from=1&to=2    -> per-file added/removed/modified/unchanged
                                    + a difflib unified diff for modified files

Run (dev), from the repo root:
    python -m uvicorn web.backend.main:app --reload --port 8000

In prod, if web/frontend/dist exists it is served at / for a single-port deploy.
"""

import difflib
import json
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles


DATA_DIR = Path(__file__).resolve().parent.parent / "data"
FRONTEND_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"

app = FastAPI(title="Memory Agent Visualizer")

# Vite dev server lives on 5173; the built frontend is same-origin (served below).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["GET"],
    allow_headers=["*"],
)


def _load(name: str):
    p = DATA_DIR / name
    if not p.exists():
        return None
    return json.loads(p.read_text(encoding="utf-8"))


def _index(files):
    return {f["path"]: f.get("content", "") for f in files}


@app.get("/api/sessions")
def sessions():
    data = _load("sessions.json")
    if data is None:
        raise HTTPException(404, "sessions.json not found — run web/parse_outputs.py")
    return data


@app.get("/api/memory/{n}")
def memory(n: int):
    data = _load(f"memory_s{n}.json")
    if data is None:
        raise HTTPException(
            404, f"memory_s{n}.json not found — run web/snapshot_memory.py {n}"
        )
    return {"session": n, "files": data}


@app.get("/api/diff")
def diff(from_: int = Query(..., alias="from"), to: int = Query(...)):
    a = _load(f"memory_s{from_}.json")
    b = _load(f"memory_s{to}.json")
    if a is None or b is None:
        raise HTTPException(404, "Missing snapshot(s) for the requested sessions.")

    amap, bmap = _index(a), _index(b)
    counts = {"added": 0, "removed": 0, "modified": 0, "unchanged": 0}
    files = []

    for path in sorted(set(amap) | set(bmap)):
        in_a, in_b = path in amap, path in bmap
        if in_a and not in_b:
            status = "removed"
        elif in_b and not in_a:
            status = "added"
        elif amap[path] == bmap[path]:
            status = "unchanged"
        else:
            status = "modified"
        counts[status] += 1

        entry = {
            "path": path,
            "status": status,
            "from_content": amap.get(path),
            "to_content": bmap.get(path),
        }
        if status == "modified":
            entry["unified"] = "".join(
                difflib.unified_diff(
                    amap[path].splitlines(keepends=True),
                    bmap[path].splitlines(keepends=True),
                    fromfile=f"s{from_}:{path}",
                    tofile=f"s{to}:{path}",
                )
            )
        files.append(entry)

    return {"from": from_, "to": to, "summary": counts, "files": files}


# Single-port prod: serve the built frontend if it has been built.
if FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIST), html=True), name="static")
