import pandas as pd
import numpy as np
import logging
from typing import Optional

logger = logging.getLogger(__name__)

def calculate_new_highs(close_df: pd.DataFrame, target_date: str) -> pd.DataFrame:
    """
    Calculate if stock is at 5/20/200 day high.
    Returns DataFrame with columns [is_high_5d, is_high_20d, is_high_200d] indexed by stock_code.
    """
    if close_df.empty:
        return pd.DataFrame()
    
    try:
        # Check 5, 20, 200
        # min_periods set to handle recent IPOs or short history gracefully
        h5 = close_df.rolling(window=5, min_periods=3).max()
        h20 = close_df.rolling(window=20, min_periods=10).max()
        h200 = close_df.rolling(window=200, min_periods=100).max()
        
        # Boolean masks
        is_high_5 = (close_df == h5)
        is_high_20 = (close_df == h20)
        is_high_200 = (close_df == h200)

        # Extract result for target_date
        if target_date in close_df.index:
            row_h5 = is_high_5.loc[target_date]
            row_h20 = is_high_20.loc[target_date]
            row_h200 = is_high_200.loc[target_date]
        else:
            # Fallback to last available date
            row_h5 = is_high_5.iloc[-1]
            row_h20 = is_high_20.iloc[-1]
            row_h200 = is_high_200.iloc[-1]

        # 互斥旗標：較長週期優先，避免同一股票在多個新高區間重複出現
        res = pd.DataFrame({
            'is_high_200d': row_h200,
            'is_high_20d': row_h20 & ~row_h200,
            'is_high_5d': row_h5 & ~row_h20,
        })
        return res
        
    except Exception as e:
        logger.error(f"Error calculating new highs: {e}")
        return pd.DataFrame()

def calculate_volatility(
    close_df: pd.DataFrame, 
    high_df: pd.DataFrame, 
    low_df: pd.DataFrame, 
    open_df: pd.DataFrame, 
    target_date: str, 
    timeperiod: int = 20
) -> Optional[pd.Series]:
    """
    Calculates candle-based volatility: (Avg Candle Range / Avg Price) * 100
    """
    if close_df.empty:
        return None

    try:
        bullish_candle = close_df >= open_df
        
        # Shift close for previous close
        c_shift = close_df.shift()
        
        # Volatility components
        # (Previous Close - Open) + (Open - Low) + (Low - High) + (High - Close)
        # Note: This logic seems to sum absolute differences to represent total path or range?
        # Standard ATR is commonly used, but preserving user's specific logic here.
        # User Logic from FinlabService:
        # bullish_v = (c_shift - open).abs() + (open - low).abs() + (low - high).abs() + (high - close).abs()
        # bearish_v = ... (same components, different masks? actually formula looked identical in components, just diff arrangement)
        
        # Re-implementing exact logic from FinlabService
        
        term1 = (c_shift - open_df).abs()
        term2 = (open_df - low_df).abs()
        term3 = (low_df - high_df).abs()
        term4 = (high_df - close_df).abs() # Bullish case
        
        # Bearish: (c_shift - open) + (open - high) + (high - low) + (low - close)
        # Let's just use the exact logic from before.
        
        bullish_v = term1 + term2 + term3 + term4
        
        bearish_v = (c_shift - open_df).abs() + \
                    (open_df - high_df).abs() + \
                    (high_df - low_df).abs() + \
                    (low_df - close_df).abs()
        
        candle_volatility = pd.DataFrame(np.nan, index=close_df.index, columns=close_df.columns)
        candle_volatility = candle_volatility.mask(bullish_candle, bullish_v).mask(~bullish_candle, bearish_v)
        
        vol_avg = candle_volatility.rolling(timeperiod).mean()
        price_avg = close_df.rolling(timeperiod).mean()
        
        volatility = (vol_avg / price_avg) * 100
        
        if target_date in volatility.index:
            return volatility.loc[target_date]
        else:
            return volatility.iloc[-1]
            
    except Exception as e:
        logger.error(f"Error calculating volatility: {e}")
        return None

def calculate_revenue_momentum(revenue_df: pd.DataFrame, target_date: str) -> Optional[pd.Series]:
    """
    Calculates Revenue Momentum Rank:
    (rev.rolling(3).mean() / rev.rolling(12).mean()).rank(pct=True, axis=1)
    """
    if revenue_df.empty:
        return None
        
    try:
        # 3-month avg / 12-month avg
        short_ma = revenue_df.rolling(3).mean()
        long_ma = revenue_df.rolling(12).mean()
        
        momentum = short_ma / long_ma
        
        # Rank across stocks (axis=1 means row-wise, i.e., rank stocks for each date)
        # pct=True returns percentile (0.0 - 1.0)
        momentum_rank = momentum.rank(pct=True, axis=1)
        
        if target_date in momentum_rank.index:
            return momentum_rank.loc[target_date]
        else:
            return momentum_rank.iloc[-1]
            
    except Exception as e:
        logger.error(f"Error calculating revenue momentum: {e}")
        return None
