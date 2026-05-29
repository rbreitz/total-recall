# Memory Agent, Visualized

The web visualization layer for the Helios sales-engineer demo. It turns the
three-terminal demo (`run_session_1.py`, `run_session_2.py`, `inspect_memory.py`)
into one screen with three views:

| Terminal pain | App view |
| --- | --- |
| Two `.txt` files you read aloud | **Answer Compare** — session answers side by side, new words in B highlighted |
| `inspect_memory.py` text dump | **Memory Browser** — the `/mnt/memory/` file tree, clickable |
| "trust me, it changed" | **Memory Diff** — git-style red/green of what the agent added/updated (the **S8** headline) |

This layer is **additive** — it never touches the agent scripts
(`create_agent.py`, `run_session_*.py`). It **replays captured artifacts**, so
the demo needs no network: `ANTHROPIC_API_KEY` + network are required only at
*capture* time, never during the demo.

## Architecture

Backend and frontend agree on one JSON contract in `web/data/`:

```
web/data/
  sessions.json      # [{ n, title, question, answer, customer? }]   <- parse_outputs.py
  memory_s1.json     # [{ path, content, char_count }]  snapshot AFTER session 1
  memory_s2.json     # snapshot AFTER session 2
  memory_s3.json     # (optional) after the adversarial round
```

The diff is **computed, not captured** — re-running sessions never desyncs it.
The repo ships **sample data** for the Helios/Northwind deal, so the UI runs
before any live session.

## Run the demo (replay — no network)

```bash
# backend deps
pip install -r web/requirements.txt
# frontend deps (first time only)
cd web/frontend && npm install && cd ../..

# one command — FastAPI (8000) + Vite (5173) together
python web/dev.py
# open http://localhost:5173
```

Single-port production build:

```bash
cd web/frontend && npm run build && cd ../..
python -m uvicorn web.backend.main:app --port 8000
# open http://localhost:8000  (FastAPI serves the built frontend)
```

## Capture real data (between live sessions)

Requires `ANTHROPIC_API_KEY` (or a `.env`) and network. `snapshot_memory.py`
injects `truststore`, so it works behind corporate TLS inspection (the same fix
`skill_studio` uses — otherwise the SDK throws `APIConnectionError`).

```
python create_agent.py
python run_session_1.py
python web/snapshot_memory.py 1     # freeze the "before" state
python run_session_2.py
python web/snapshot_memory.py 2     # freeze the "after" state
python web/parse_outputs.py         # outputs/session*.txt -> sessions.json
```

> **Order matters:** snapshot *between* sessions. Snapshotting only at the end
> loses the "before" state and the diff breaks.

Per-tenant (S5): `python web/snapshot_memory.py 1 --customer globex` reads
`.memory_store_globex`. `sessions.json` already carries an optional `customer`
field, so a tenant switcher can be added later without breaking the contract.

## API

| Endpoint | Returns |
| --- | --- |
| `GET /api/sessions` | session list + answers |
| `GET /api/memory/{n}` | memory snapshot for session `n` |
| `GET /api/diff?from=1&to=2` | per-file `added`/`removed`/`modified`/`unchanged` + a `difflib` unified diff for modified files |
