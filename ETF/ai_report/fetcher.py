"""資料獲取層：封裝所有 ETF 相關 DB 查詢邏輯。"""

import logging
import pandas as pd
from sqlalchemy import text
from sqlalchemy.engine import Engine
from sqlalchemy.sql.elements import TextClause

logger = logging.getLogger(__name__)


class ETFDataFetcher:
    """封裝所有 ETF 相關資料庫查詢，消除重複的 placeholder 建立模板。"""

    def __init__(self, engine: Engine, etf_code: str = "00981A") -> None:
        self.engine = engine
        self.etf_code = etf_code

    def _query_by_codes(
        self,
        query: TextClause,
        codes: list[str],
        extra_params: dict | None = None,
    ) -> pd.DataFrame:
        """通用查詢 helper：建立 placeholder、執行 SQL、回傳 DataFrame。

        Args:
            query: SQLAlchemy text 查詢（含 {placeholders} 格式字串）。
            codes: 股票代碼列表。
            extra_params: 額外的查詢參數（與 codes params 合併）。

        Returns:
            查詢結果 DataFrame；codes 為空時直接回傳空 DataFrame。
        """
        if not codes:
            return pd.DataFrame()

        placeholders = ",".join([f":code_{i}" for i in range(len(codes))])
        params: dict = {f"code_{i}": code for i, code in enumerate(codes)}
        if extra_params:
            params.update(extra_params)

        # 將 {placeholders} 替換後重新建立 text 物件
        rendered_sql = str(query).replace("{placeholders}", placeholders)
        with self.engine.connect() as conn:
            result = conn.execute(text(rendered_sql), params)
            return pd.DataFrame(result.fetchall(), columns=list(result.keys()))

    def fetch_holdings(self, etf_code: str | None = None) -> pd.DataFrame:
        """取得 ETF 最新持股快照，含最新月營收 YoY/MoM。

        Args:
            etf_code: ETF 代碼，預設使用 __init__ 傳入的 etf_code。

        Returns:
            持股 DataFrame，weight/revenue_yoy/revenue_mom 已轉為 float。
        """
        target_etf = etf_code if etf_code is not None else self.etf_code
        query = text("""
            WITH LatestDate AS (
                SELECT MAX(data_date) as max_date
                FROM etf_holdings_snapshot
                WHERE etf_code = :etf_code
            )
            SELECT h.*, r.revenue_yoy, r.revenue_mom, (SELECT max_date FROM LatestDate) as snapshot_date
            FROM etf_holdings_snapshot h
            LEFT JOIN stock_revenue_monthly r
                ON h.stock_code = r.stock_code
                AND r.data_date = (
                    SELECT MAX(data_date)
                    FROM stock_revenue_monthly
                    WHERE stock_code = h.stock_code
                )
            WHERE h.etf_code = :etf_code
              AND h.data_date = (SELECT max_date FROM LatestDate)
            ORDER BY h.weight DESC
        """)
        with self.engine.connect() as conn:
            result = conn.execute(query, {"etf_code": target_etf})
            df = pd.DataFrame(result.fetchall(), columns=list(result.keys()))

        # 移除重複欄位
        df = df.loc[:, ~df.columns.duplicated()]

        # 確保數值型別
        if not df.empty:
            for col in ("weight", "revenue_yoy", "revenue_mom"):
                if col in df.columns:
                    df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0.0)

        return df

    def fetch_technical_data(self, stock_codes: list[str]) -> pd.DataFrame:
        """取得近期收盤價與投信買賣超資料。"""
        query = """
            SELECT stock_code, data_date, close, it_buy, margin_ratio
            FROM stock_prices_daily
            WHERE stock_code IN ({placeholders})
            ORDER BY data_date DESC
            LIMIT 3000
        """
        try:
            return self._query_by_codes(text(query), stock_codes)
        except Exception as e:
            logger.warning(f"Could not fetch technical data: {e}")
            return pd.DataFrame()

    def fetch_broker_data(self, stock_codes: list[str]) -> pd.DataFrame:
        """取得主力券商買賣超資料。"""
        query = """
            SELECT stock_code, data_date, net_volume
            FROM stock_broker_transactions
            WHERE stock_code IN ({placeholders})
            ORDER BY data_date DESC
            LIMIT 1000
        """
        try:
            return self._query_by_codes(text(query), stock_codes)
        except Exception as e:
            logger.warning(f"Could not fetch broker data: {e}")
            return pd.DataFrame()

    def fetch_chip_data(self, stock_codes: list[str]) -> pd.DataFrame:
        """取得大戶週持股比例資料。"""
        query = """
            SELECT stock_code, data_date, shareholder_tier, custody_ratio
            FROM stock_shareholder_weekly
            WHERE stock_code IN ({placeholders})
              AND shareholder_tier IN (1, 2, 3, 4, 5, 15)
            ORDER BY data_date DESC
            LIMIT 3000
        """
        try:
            return self._query_by_codes(text(query), stock_codes)
        except Exception as e:
            logger.warning(f"Could not fetch chip data: {e}")
            return pd.DataFrame()
