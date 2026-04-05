"""
Weight History Processor

從 etf_holdings_snapshot 聚合每檔成分股的歷史權重走勢，
儲存至 etf_weight_history 表，供前端 Dashboard 繪製走勢圖。

對齊 kevin12596 的設計：可依前 5/10/15/全部 持股篩選走勢。
"""

import logging
import pandas as pd
from typing import List, Dict, Any

logger = logging.getLogger(__name__)


class WeightHistoryProcessor:
    """聚合持股歷史權重走勢"""

    @staticmethod
    def build_from_snapshots(
        snapshots: List[Dict[str, Any]],
        etf_code: str,
    ) -> List[Dict[str, Any]]:
        """
        從多日快照建立 weight_history 記錄。

        Args:
            snapshots: list of {data_date, stock_code, stock_name, weight, shares, rank}
            etf_code: ETF 代碼

        Returns:
            records ready for DB upsert into etf_weight_history
        """
        if not snapshots:
            return []

        records = []
        for row in snapshots:
            records.append({
                "etf_code": etf_code,
                "stock_code": row["stock_code"],
                "stock_name": row.get("stock_name", ""),
                "data_date": row["data_date"],
                "weight": float(row["weight"]),
                "shares": int(row.get("shares", 0)),
                "rank": int(row.get("rank", 0)),
            })
        return records

    @staticmethod
    def compute_latest_ranks(df: pd.DataFrame) -> pd.DataFrame:
        """
        根據今日快照計算每檔股票的持股排名（按權重降序）。

        Args:
            df: 含 code, name, weight, shares 的 DataFrame

        Returns:
            df with added 'rank' column (1-based)
        """
        if df.empty:
            return df
        df = df.copy()
        df["rank"] = df["weight"].rank(ascending=False, method="min").astype(int)
        return df

    @staticmethod
    def get_top_n_stocks(df: pd.DataFrame, top_n: int) -> List[str]:
        """
        回傳今日前 N 大持股代碼清單。

        Args:
            df: 含 rank 欄位的 DataFrame
            top_n: 要取的名次數

        Returns:
            list of stock codes
        """
        if df.empty or "rank" not in df.columns:
            return []
        return df[df["rank"] <= top_n]["code"].tolist()
