"""DataValidationStep — 關鍵步驟，驗證爬取結果進入 diff 引擎前的資料品質。

驗證規則：
- 比重總和 < 50% 或 > 150% → raise ValueError（中斷 Pipeline）
- 持股筆數 = 0 → raise ValueError（中斷 Pipeline）
- 個股 price ≤ 0 或 price > 50000 → log warning + 記入 ctx.validation_warnings（繼續）

Step 本身的程式 bug（KeyError 等）不 raise，記錄後繼續。
"""

import logging
from typing import TYPE_CHECKING

from ETF.pipeline.context import PipelineContext
from ETF.pipeline.steps.base import BaseStep

if TYPE_CHECKING:
    from ETF.pipeline.services import PipelineServices

logger = logging.getLogger(__name__)


class DataValidationStep(BaseStep):
    """驗證持股資料品質（PriceAttachStep 之後、DiffComputeStep 之前）。"""

    @property
    def name(self) -> str:
        return "Data Validation"

    def execute(self, ctx: PipelineContext, services: "PipelineServices") -> PipelineContext:
        try:
            self._validate(ctx)
        except ValueError:
            raise
        except Exception as e:
            msg = f"DataValidationStep 內部錯誤：{e}"
            logger.error("[DataValidationStep] %s", e, exc_info=True)
            ctx.validation_warnings.append(msg)

        return ctx

    def _validate(self, ctx: PipelineContext) -> None:
        df = ctx.df
        if df is None:
            logger.info("[DataValidationStep] ctx.df is None, skipping validation")
            return

        etf_code = ctx.etf_code

        # 1. 持股筆數驗證
        count = len(df)
        if count == 0:
            raise ValueError(f"持股筆數異常：{etf_code} = 0 筆")

        # 2. 比重總和驗證
        if "weight" in df.columns:
            total_weight = df["weight"].fillna(0).sum()
            if total_weight < 50 or total_weight > 150:
                raise ValueError(
                    f"持股比重異常：{etf_code} 總和 = {total_weight:.1f}%（期望 50%–150%）"
                )
            logger.info(
                "[DataValidationStep] %s weight sum = %.1f%%, count = %d → OK",
                etf_code, total_weight, count,
            )
        else:
            logger.warning("[DataValidationStep] 'weight' column not found, skipping weight check")

        # 3. 個股價格異常偵測（警告，不中斷）
        if "price" in df.columns:
            anomalies = df[
                df["price"].notna() & ((df["price"] <= 0) | (df["price"] > 50000))
            ]
            for _, row in anomalies.iterrows():
                code = row.get("code", "N/A")
                price = row.get("price", "N/A")
                msg = f"個股價格異常：{code} price={price}"
                logger.warning("[DataValidationStep] %s", msg)
                ctx.validation_warnings.append(msg)

        logger.info("[DataValidationStep] Validation passed")
