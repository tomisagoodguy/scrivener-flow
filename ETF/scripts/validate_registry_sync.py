"""Registry sync validation script.

Parses ETF codes from src/lib/investment/etfRegistry.ts and compares
with ETF/config/etf_registry.py's ALL_ETF_CODES.
Exits with code 1 if any discrepancy is found.

Usage:
    uv run python ETF/scripts/validate_registry_sync.py
"""

import pathlib
import re
import sys


def parse_ts_codes(content: str) -> set[str]:
    """Extract ETF codes from etfRegistry.ts content using regex.

    Matches patterns like: code: '00981A'
    If format changes (multiline, double quotes), update this regex and the
    comment in etfRegistry.ts about the expected format.
    """
    pattern = re.compile(r"code:\s*['\"]([A-Z0-9]+A)['\"]")
    return set(pattern.findall(content))


def parse_py_codes(content: str) -> set[str]:
    """Extract ETF codes from etf_registry.py content using regex.

    Matches patterns like: code="00981A"
    """
    pattern = re.compile(r'code=["\']([A-Z0-9]+A)["\']')
    return set(pattern.findall(content))


def compare_registries(ts_codes: set[str], py_codes: set[str]) -> dict[str, set[str]]:
    return {
        "only_in_ts": ts_codes - py_codes,
        "only_in_py": py_codes - ts_codes,
    }


def main() -> int:
    repo_root = pathlib.Path(__file__).parents[2]
    ts_path = repo_root / "src" / "lib" / "investment" / "etfRegistry.ts"
    py_path = repo_root / "ETF" / "config" / "etf_registry.py"

    if not ts_path.exists():
        print(f"ERROR: TypeScript registry not found: {ts_path}", file=sys.stderr)
        return 1
    if not py_path.exists():
        print(f"ERROR: Python registry not found: {py_path}", file=sys.stderr)
        return 1

    ts_codes = parse_ts_codes(ts_path.read_text(encoding="utf-8"))
    if not ts_codes:
        print(
            "ERROR: No ETF codes parsed from etfRegistry.ts — "
            "check that the format matches `code: 'XXXXXА'`",
            file=sys.stderr,
        )
        return 1

    py_codes = parse_py_codes(py_path.read_text(encoding="utf-8"))
    if not py_codes:
        print(
            "ERROR: No ETF codes parsed from etf_registry.py — "
            "check that the format matches `code=\"XXXXXА\"`",
            file=sys.stderr,
        )
        return 1

    diff = compare_registries(ts_codes, py_codes)

    if not diff["only_in_ts"] and not diff["only_in_py"]:
        print(f"Registry sync OK: {len(ts_codes)} ETFs")
        return 0

    if diff["only_in_ts"]:
        for code in sorted(diff["only_in_ts"]):
            print(f"Only in TS: {code}")
    if diff["only_in_py"]:
        for code in sorted(diff["only_in_py"]):
            print(f"Only in PY: {code}")
    return 1


if __name__ == "__main__":
    sys.exit(main())
