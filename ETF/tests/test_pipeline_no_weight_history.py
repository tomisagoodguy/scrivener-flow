"""Pipeline 不得再寫入 etf_weight_history（該表改為由 snapshot 推導的 view）。"""

from pathlib import Path

from ETF.pipeline.orchestrator import PipelineOrchestrator

ETF_ROOT = Path(__file__).resolve().parents[1]
FORBIDDEN = ("INSERT INTO etf_weight_history", "save_weight_history")


def test_orchestrator_has_no_weight_history_step() -> None:
    names = [cls.__name__ for cls in PipelineOrchestrator.DEFAULT_STEPS]
    assert "WeightHistoryStep" not in names


def test_pipeline_and_database_sources_do_not_write_weight_history() -> None:
    offenders: list[str] = []
    for sub in ("pipeline", "database"):
        for path in (ETF_ROOT / sub).rglob("*.py"):
            text = path.read_text(encoding="utf-8")
            for token in FORBIDDEN:
                if token in text:
                    offenders.append(f"{path.relative_to(ETF_ROOT)}: {token}")
    assert not offenders, offenders
