"""
Low Volatility Alpha YoY Strategy

基於營收成長、低波動與技術面篩選的量化選股策略。

策略邏輯：
1. 低波動率篩選 (std_rank < 0.92)
2. 高RSV動能 (rsv_rank > 0.9)
3. 相對強度過濾 (rs_rank > 0.5)
4. 技術面確認 (MA5 > MA60, 接近歷史高點)
5. 營收成長驅動 (營收3月均/12月均 > 0.8分位)
6. 依營收年增率選出 Top 10
"""

from finlab import data
import pandas as pd
import logging
from typing import Tuple, Optional
from datetime import datetime

logger = logging.getLogger(__name__)


class LowVolAlphaStrategy:
    """低波動營收成長策略"""
    
    # 排除股票清單（使用者指定）
    EXCLUDED_STOCKS = [
        '2254', '2258', '2432', '3150', '6423', '6534', '6645',
        '6757', '6771', '6794', '6854', '6873', '6902', '6949',
        '6951', '8162', '8487'
    ]
    
    def __init__(self):
        self.strategy_code = 'low_vol_alpha_yoy'
        self.strategy_name = '低波動率營收成長策略'
        self.max_holdings = 10
    
    def calculate_indicators(
        self, 
        close: pd.DataFrame, 
        n_std: int = 150, 
        n_rsv: int = 180, 
        n_rs: int = 100, 
        n_high: int = 260
    ) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.DataFrame]:
        """
        計算策略所需的技術指標
        
        Args:
            close: 收盤價 DataFrame
            n_std: 波動率計算週期
            n_rsv: RSV 計算週期
            n_rs: 相對強度計算週期
            n_high: 歷史高點計算週期
            
        Returns:
            std_rank, rsv_rank, rs_rank, price_to_high_rank
        """
        logger.info("開始計算技術指標...")
        
        # 1. 波動率排名
        std_rank = close.pct_change().rolling(
            n_std, min_periods=int(n_std/2)
        ).std().rank(axis=1, pct=True)
        
        # 2. RSV 排名 (KD指標的未平滑版本)
        rolling_min = close.rolling(n_rsv, min_periods=int(n_rsv/2)).min()
        rolling_max = close.rolling(n_rsv, min_periods=int(n_rsv/2)).max()
        rsv = (close - rolling_min) / (rolling_max - rolling_min)
        rsv_rank = rsv.rank(axis=1, pct=True)
        
        # 3. 相對強度排名
        rs_rank = (close / close.shift(n_rs)).rank(pct=True, axis=1)
        
        # 4. 距離歷史高點排名
        price_to_high = close / close.rolling(n_high, min_periods=int(n_high/2)).max()
        price_to_high_rank = price_to_high.rank(axis=1, pct=True)
        
        logger.info("✅ 技術指標計算完成")
        return std_rank, rsv_rank, rs_rank, price_to_high_rank
    
    def get_data(self) -> Tuple:
        """
        取得策略運算所需的原始資料
        
        Returns:
            close, amt, rev, natr, rev_yoy_growth, rev_mom_growth
        """
        logger.info("從 Finlab 取得市場資料...")
        
        with data.universe('TSE_OTC'):
            close = data.get('price:收盤價')
            amt = data.get('price:成交金額')
            rev = data.get('monthly_revenue:當月營收')
            natr = data.indicator('NATR', timeperiod=120)
            rev_yoy_growth = data.get('monthly_revenue:去年同月增減(%)')
            
            # 1. 先計算營收月增率 (MoM) 與月均線 - 在月頻率下計算
            rev_mom_growth = (rev / rev.shift(1) - 1) * 100
            rev_ma3 = rev.rolling(3).mean()
            rev_ma12 = rev.rolling(12).mean()
            
            # 2. 將月度資料對齊到日頻率 (Reindex & Forward Fill)
            # 這樣每日交易日都能取到最近一次公告的營收數據
            rev = rev.reindex(close.index, method='ffill')
            rev_yoy_growth = rev_yoy_growth.reindex(close.index, method='ffill')
            rev_mom_growth = rev_mom_growth.reindex(close.index, method='ffill')
            rev_ma3 = rev_ma3.reindex(close.index, method='ffill')
            rev_ma12 = rev_ma12.reindex(close.index, method='ffill')
        
        logger.info("✅ 市場資料載入完成 (已對齊日頻率)")
        return close, amt, rev, natr, rev_yoy_growth, rev_mom_growth, rev_ma3, rev_ma12
    
    def moving_average(self, close: pd.DataFrame, period: int) -> pd.DataFrame:
        """計算移動平均線"""
        return close.rolling(period).mean()
    
    def create_conditions(
        self,
        std_rank: pd.DataFrame,
        rsv_rank: pd.DataFrame,
        rs_rank: pd.DataFrame,
        amt: pd.DataFrame,
        natr: pd.DataFrame,
        rev: pd.DataFrame,
        close: pd.DataFrame,
        price_to_high: pd.DataFrame,
        rev_ma3: pd.DataFrame,
        rev_ma12: pd.DataFrame
    ) -> dict:
        """
        建立選股條件
        
        Returns:
            dict: 各項條件的 DataFrame (True/False)
        """
        logger.info("建立選股條件...")
        
        ma5 = self.moving_average(close, 5)
        ma60 = self.moving_average(close, 60)
        ma240 = self.moving_average(close, 240)
        
        conditions = {
            "amt_above_threshold": amt > 1.5 * 10**7,
            "rsv_above_90_pct": rsv_rank > 0.9,
            "low_volatility": std_rank < 0.92,
            "rs_above_50_pct": rs_rank > 0.5,
            "natr_below_65_pct": natr.rank(axis=1, pct=True) < 0.65,
            "revenue_growth_positive": (rev_ma3 / rev_ma12).rank(pct=True, axis=1) > 0.8,
            "ma5_trending_up": ma5.diff().gt(0),
            "price_close_to_high": price_to_high > 0.85,
            "price_above_ma60": close > ma60,
            "price_above_ma240": close > ma240,
            "ma5_above_ma60": ma5 > ma60
        }
        
        logger.info(f"✅ 已建立 {len(conditions)} 項選股條件")
        return conditions
    
    def combine_conditions(self, conditions: dict) -> pd.DataFrame:
        """合併所有條件成單一 DataFrame"""
        combined = list(conditions.values())[0]
        for condition in list(conditions.values())[1:]:
            combined &= condition
        return combined
    
    def run_selection(self, target_date: Optional[str] = None) -> Tuple[pd.DataFrame, str]:
        """
        執行選股邏輯，返回 Top 10 股票及其詳細資料
        
        Args:
            target_date: 指定計算日期 (格式: 'YYYY-MM-DD')，None 表示使用最新日期
            
        Returns:
            (selected_df, data_date): 選股結果 DataFrame 與資料日期
        """
        logger.info(f"開始執行【{self.strategy_name}】選股...")
        
        # Step 1: 取得資料
        close, amt, rev, natr, rev_yoy, rev_mom, rev_ma3, rev_ma12 = self.get_data()
        
        # Step 2: 計算指標
        std_rank, rsv_rank, rs_rank, price_to_high_rank = self.calculate_indicators(close)
        
        # Step 3: 建立條件
        conditions = self.create_conditions(
            std_rank, rsv_rank, rs_rank, amt, natr, rev, close, price_to_high_rank,
            rev_ma3, rev_ma12
        )
        
        # Step 4: 合併條件
        combined_condition = self.combine_conditions(conditions)
        
        # Step 5: 選出 Top 10（依營收年增率排名）
        logger.info("依營收年增率篩選 Top 10...")
        position = rev_yoy[combined_condition].is_largest(self.max_holdings)
        
        # Step 6: 排除指定股票
        position[self.EXCLUDED_STOCKS] = False
        
        # Step 7: 取得目標日期的選股結果
        if target_date is None:
            # 使用最後一個在 position 中有資料的交易日
            # 且該日期必須是過去的日期（非未來）
            from datetime import datetime
            today = pd.Timestamp(datetime.now().date())
            
            valid_position_dates = position.dropna(how='all').index
            # 過濾掉未來日期
            valid_position_dates = [d for d in valid_position_dates if d <= today]
            
            if len(valid_position_dates) == 0:
                logger.error("❌ 無符合條件的選股結果")
                return pd.DataFrame(), ""
            
            # Debug: 顯示 position 的日期範圍
            logger.info(f"Position 日期範圍: {valid_position_dates[0]} ~ {valid_position_dates[-1]}")
            logger.info(f"共有 {len(valid_position_dates)} 個交易日")
            
            target_date = valid_position_dates[-1]
            logger.info(f"使用最新交易日: {target_date.strftime('%Y-%m-%d')}")
        else:
            target_date = pd.Timestamp(target_date)
        
        data_date_str = target_date.strftime('%Y-%m-%d')
        
        # 確保 target_date 存在於 position index 中
        if target_date not in position.index:
            logger.error(f"❌ 目標日期 {data_date_str} 不在選股結果中")
            return pd.DataFrame(), data_date_str
        
        selected_stocks = position.loc[target_date]
        selected_stocks = selected_stocks[selected_stocks > 0]
        
        if selected_stocks.empty:
            logger.warning(f"⚠️  {data_date_str} 無符合條件的股票")
            return pd.DataFrame(), data_date_str
        
        # Step 8: 整理詳細資料
        logger.info("收集選股詳細資料...")
        results = []
        
        for i, stock_code in enumerate(selected_stocks.index, 1):
            try:
                # 計算距離歷史高點百分比
                # 取得該股票到目標日期的歷史收盤價
                stock_history = close[stock_code].loc[:target_date]
                if len(stock_history) < 260:
                    # 資料不足 260 天，使用全部資料
                    hist_high = stock_history.max()
                else:
                    # 取最近 260 天的最高價
                    hist_high = stock_history.iloc[-260:].max()
                
                # 安全地取得當日價格
                if target_date in close.index:
                    current_price = close.loc[target_date, stock_code]
                else:
                    logger.warning(f"⚠️  {stock_code}: target_date {data_date_str} not in close.index")
                    continue
                
                price_to_high_pct = ((current_price / hist_high) - 1) * 100 if hist_high > 0 else 0
                
                # 安全地取得各項指標
                def safe_get(df, date, code):
                    try:
                        if date in df.index and code in df.columns:
                            val = df.loc[date, code]
                            return float(val) if pd.notna(val) else None
                        return None
                    except:
                        return None
                
                results.append({
                    'stock_code': stock_code,
                    'rank_position': i,
                    'close_price': float(current_price),
                    'revenue_yoy': safe_get(rev_yoy, target_date, stock_code),
                    'revenue_mom': safe_get(rev_mom, target_date, stock_code),
                    'amount': safe_get(amt, target_date, stock_code),
                    'natr': safe_get(natr, target_date, stock_code),
                    'rs_rank': safe_get(rs_rank, target_date, stock_code),
                    'price_to_high_pct': float(price_to_high_pct)
                })
            
            except Exception as e:
                logger.error(f"處理 {stock_code} 時發生錯誤: {e}")
                continue
        
        logger.info(f"✅ 選股完成！共選出 {len(results)} 檔股票 (日期: {data_date_str})")
        
        return pd.DataFrame(results), data_date_str


if __name__ == '__main__':
    # 測試執行
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    strategy = LowVolAlphaStrategy()
    selected_df, date_str = strategy.run_selection()
    
    if not selected_df.empty:
        print(f"\n{'='*80}")
        print(f"📊 {strategy.strategy_name} - {date_str}")
        print(f"{'='*80}\n")
        print(selected_df.to_string(index=False))
        print(f"\n{'='*80}\n")
