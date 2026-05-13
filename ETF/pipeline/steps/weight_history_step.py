"""
Weight History Step

每日 pipeline 結束後，將今日持股快照的權重資料聚合進
etf_weight_history 表，供前端 Dashboard 繪製各成分股歷史權重走勢圖。

對齊 kevin12596 history.py 功能，支援：
- 前 5 / 10 / 15 / 全部 持股走勢篩選
- 每日排名（rank）欄位供前端排序
"""

from ETF.pipeline.steps.base import BaseStep
from ETF.pipeline.context import PipelineContext
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from ETF.pipeline.services import PipelineServices
from ETF.processors.weight_history_processor import WeightHistoryProcessor


class WeightHistoryStep(BaseStep):
    """聚合並儲存持股歷史權重走勢"""

    @property
    def name(self) -> str:
        return "Save Weight History"

    def should_skip(self, ctx: PipelineContext) -> bool:
        return ctx.is_dry_run

    def execute(self, ctx: PipelineContext, services: "PipelineServices") -> PipelineContext:
        if ctx.df is None or ctx.df.empty:
            self.logger.warning("No holdings DataFrame. Skipping weight history.")
            return ctx

        # 1. 計算今日持倉排名
        df_ranked = WeightHistoryProcessor.compute_latest_ranks(ctx.df)

        # 2. 建立 weight_history records
        raw_records = df_ranked.to_dict("records")
        records = []
        for row in raw_records:
            records.append({
                "etf_code": ctx.etf_code,
                "stock_code": str(row["code"]),
                "stock_name": row.get("name", ""),
                "data_date": ctx.date_str,
                "weight": float(row["weight"]),
                "shares": int(row["shares"]),
                "rank": int(row["rank"]),
            })

        # 3. Upsert 至 DB
        services.storage.save_weight_history(records)
        self.logger.info(
            f"Weight history saved: {len(records)} 檔"
            f"（Top5: {WeightHistoryProcessor.get_top_n_stocks(df_ranked, 5)}）"
        )

        return ctx
