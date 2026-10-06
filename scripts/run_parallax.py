#!/usr/bin/env python3
"""
run_parallax.py — CLI entry-point for the PARALLAX registration pipeline.

Usage
-----
    python scripts/run_parallax.py --source <source_product_dir> \\
                                   --target <target_product_dir> \\
                                   [--output <output_dir>]

Moved here from the repo root.  The old root-level run_parallax.py is
superseded by this file and the `parallex-run` console-script registered
in pyproject.toml.
"""
from __future__ import annotations

import argparse
import sys


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run the PARALLAX Chandrayaan-2 image-correspondence pipeline."
    )
    parser.add_argument("--source", required=True, help="Path to source PDS4 product directory")
    parser.add_argument("--target", required=True, help="Path to target PDS4 product directory")
    parser.add_argument("--output", default="output", help="Directory to write results to")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    # Import here so the module can be imported without heavy deps available
    try:
        from parallex.pipeline import run  # noqa: PLC0415
    except ImportError as exc:
        print(f"[ERROR] Could not import parallex: {exc}", file=sys.stderr)
        print("        Run:  pip install -e .[dev]  from the repo root.", file=sys.stderr)
        return 1

    run(source=args.source, target=args.target, output=args.output)
    return 0


if __name__ == "__main__":
    sys.exit(main())
