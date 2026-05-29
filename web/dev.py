"""
One-command dev launcher: FastAPI (8000) + Vite (5173) together.

    python web/dev.py

Then open http://localhost:5173 — the Vite dev server proxies /api to FastAPI.
First time only:  (cd web/frontend && npm install)
"""

import subprocess
import sys
import time
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
FRONTEND = Path(__file__).resolve().parent / "frontend"


def main() -> None:
    procs = []
    try:
        procs.append(
            subprocess.Popen(
                [sys.executable, "-m", "uvicorn", "web.backend.main:app",
                 "--reload", "--port", "8000"],
                cwd=ROOT,
            )
        )
        npm = "npm.cmd" if sys.platform == "win32" else "npm"
        procs.append(subprocess.Popen([npm, "run", "dev"], cwd=FRONTEND))

        print("\n  Backend:  http://localhost:8000/api/sessions")
        print("  Frontend: http://localhost:5173   <-- open this\n")

        while True:
            time.sleep(1)
            if any(p.poll() is not None for p in procs):
                break
    except KeyboardInterrupt:
        pass
    finally:
        for p in procs:
            if p.poll() is None:
                p.terminate()


if __name__ == "__main__":
    main()
