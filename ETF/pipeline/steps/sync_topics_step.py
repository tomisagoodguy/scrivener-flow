"""
Sync Topics Step

每日從 stock-data-ai/stock-data GitHub Raw 下載投資主題資料，
upsert 至 stock_topics 與 stock_topic_assignments 資料表。
屬輔助步驟，失敗不中斷 pipeline。
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

import requests
from sqlalchemy import text

from ETF.pipeline.context import PipelineContext
from ETF.pipeline.steps.base import BaseStep

if TYPE_CHECKING:
    from ETF.pipeline.services import PipelineServices

_TOPICS_URL = (
    "https://raw.githubusercontent.com/stock-data-ai/stock-data/main/"
    "src/data/layer0/topics.json"
)
_COMPANY_TOPICS_URL = (
    "https://raw.githubusercontent.com/stock-data-ai/stock-data/main/"
    "src/data/layer3/company-topics/index.json"
)
_TIMEOUT = 30


class SyncTopicsStep(BaseStep):
    """每日同步投資主題標籤（輔助步驟）"""

    @property
    def name(self) -> str:
        return "Sync Topics"

    def execute(self, ctx: PipelineContext, services: "PipelineServices") -> PipelineContext:
        try:
            self._run(services)
        except Exception as e:
            self.logger.error(f"SyncTopicsStep failed: {e}")
        return ctx

    # ------------------------------------------------------------------
    # Internal helpers (also used by tests)
    # ------------------------------------------------------------------

    def _build_topics(self, raw: list[dict[str, Any]]) -> list[dict[str, Any]]:
        return [
            {
                "topic_id":   item.get("id", ""),
                "name":       item.get("name", ""),
                "short_name": item.get("short_name", item.get("name", "")),
                "group_name": item.get("group", None),
                "description": item.get("description", None),
                "color":      item.get("color", None),
                "icon":       item.get("icon", None),
            }
            for item in raw
            if item.get("id")
        ]

    def _build_assignments(self, index: dict[str, list[str]]) -> list[dict[str, str]]:
        rows = []
        for stock_code, topic_ids in index.items():
            for tid in topic_ids:
                rows.append({"stock_code": stock_code, "topic_id": tid})
        return rows

    def _run(self, services: "PipelineServices") -> None:
        topics_raw: list[dict[str, Any]] = requests.get(_TOPICS_URL, timeout=_TIMEOUT).json()
        company_index: dict[str, list[str]] = requests.get(_COMPANY_TOPICS_URL, timeout=_TIMEOUT).json()

        topic_rows = self._build_topics(topics_raw)
        assignment_rows = self._build_assignments(company_index)

        if not topic_rows:
            self.logger.warning("SyncTopicsStep: no topics fetched, skipping")
            return

        fetched_topic_ids = {r["topic_id"] for r in topic_rows}
        # 過濾掉 topics.json 沒有定義的 topic_id，防止 FK 違反
        assignment_rows = [r for r in assignment_rows if r["topic_id"] in fetched_topic_ids]
        fetched_pairs = {(r["stock_code"], r["topic_id"]) for r in assignment_rows}

        with services.sql_storage.engine.connect() as conn:
            # Upsert topics
            conn.execute(
                text("""
                    INSERT INTO stock_topics
                        (topic_id, name, short_name, group_name, description, color, icon, updated_at)
                    VALUES
                        (:topic_id, :name, :short_name, :group_name, :description, :color, :icon, now())
                    ON CONFLICT (topic_id) DO UPDATE SET
                        name        = EXCLUDED.name,
                        short_name  = EXCLUDED.short_name,
                        group_name  = EXCLUDED.group_name,
                        description = EXCLUDED.description,
                        color       = EXCLUDED.color,
                        icon        = EXCLUDED.icon,
                        updated_at  = now()
                """),
                topic_rows,
            )

            # Upsert assignments
            if assignment_rows:
                conn.execute(
                    text("""
                        INSERT INTO stock_topic_assignments (stock_code, topic_id)
                        VALUES (:stock_code, :topic_id)
                        ON CONFLICT (stock_code, topic_id) DO NOTHING
                    """),
                    assignment_rows,
                )

            # Delete orphan assignments (stocks/topics no longer in source)
            existing = conn.execute(
                text("SELECT stock_code, topic_id FROM stock_topic_assignments")
            ).fetchall()
            orphan_pairs = [
                {"stock_code": r[0], "topic_id": r[1]}
                for r in existing
                if (r[0], r[1]) not in fetched_pairs
            ]
            if orphan_pairs:
                conn.execute(
                    text("""
                        DELETE FROM stock_topic_assignments
                        WHERE stock_code = :stock_code AND topic_id = :topic_id
                    """),
                    orphan_pairs,
                )

            # Delete orphan topics
            orphan_topics = [
                {"topic_id": tid}
                for tid in (
                    row[0]
                    for row in conn.execute(text("SELECT topic_id FROM stock_topics")).fetchall()
                )
                if tid not in fetched_topic_ids
            ]
            if orphan_topics:
                conn.execute(
                    text("DELETE FROM stock_topics WHERE topic_id = :topic_id"),
                    orphan_topics,
                )

            conn.commit()

        self.logger.info(
            f"SyncTopicsStep: upserted {len(topic_rows)} topics, "
            f"{len(assignment_rows)} assignments"
        )
