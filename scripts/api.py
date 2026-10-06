#!/usr/bin/env python3
"""
api.py — Convenience launcher for the PARALLAX FastAPI backend.

Usage
-----
    python scripts/api.py [--host HOST] [--port PORT] [--reload]

Moved here from the repo root to keep root clean.
The preferred production invocation is:
    parallex-api          (console-script installed by pyproject.toml)
or:
    uvicorn parallex.api.app:app --host 0.0.0.0 --port 8000
"""
from __future__ import annotations

import argparse
import sys


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Start the PARALLAX FastAPI backend.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--reload", action="store_true", help="Enable auto-reload (dev mode)")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    try:
        import uvicorn  # noqa: PLC0415
    except ImportError:
        print("[ERROR] uvicorn not installed.  Run: pip install -e .[dev]", file=sys.stderr)
        return 1

    uvicorn.run(
        "parallex.api.app:app",
        host=args.host,
        port=args.port,
        reload=args.reload,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
