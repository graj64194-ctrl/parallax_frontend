#!/usr/bin/env python3
"""
downloader.py — Helper script to fetch/verify Chandrayaan-2 PDS4 products.

Usage
-----
    python scripts/downloader.py --dataset IIRS|OHRC|TMC2 \\
                                 --product-id <product_id> \\
                                 --output-dir <dir>

Moved here from the repo root.  Implement actual download logic in
src/parallex/io/downloader.py and call it from here.
"""
from __future__ import annotations

import argparse
import sys

DATASETS = ("IIRS", "OHRC", "TMC2")


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Download Chandrayaan-2 PDS4 products.")
    parser.add_argument("--dataset", choices=DATASETS, required=True)
    parser.add_argument("--product-id", required=True)
    parser.add_argument("--output-dir", default="data/raw")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    try:
        from parallex.io import downloader  # noqa: PLC0415
    except ImportError as exc:
        print(f"[ERROR] {exc}\nRun: pip install -e .[dev]", file=sys.stderr)
        return 1

    downloader.fetch(
        dataset=args.dataset,
        product_id=args.product_id,
        output_dir=args.output_dir,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
