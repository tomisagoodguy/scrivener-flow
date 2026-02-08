"""
Notify Step

負責發送 LINE 通知（異動通知與完成摘要）。
"""

from .base import BaseStep
from ETF.pipeline.context import PipelineContext
import pandas as pd
from typing import List, Dict, Any


class NotifyStep(BaseStep):
    """發送 LINE 通知"""
    
    @property
    def name(self) -> str:
        return "Send Notifications"
    
    def should_skip(self, ctx: PipelineContext) -> bool:
        return ctx.is_dry_run
    
    def execute(self, ctx: PipelineContext) -> PipelineContext:
        notifier = ctx.notifier
        
        # 1. 發送異動通知
        if ctx.diff_logs:
            notifier.notify_diffs(ctx.diff_logs, ctx.etf_code, ctx.date_str)
            self.logger.info(f"Sent {len(ctx.diff_logs)} diff notifications.")
        
        # 2. 發送完成摘要（含市場訊號）
        self._send_completion_summary(ctx, notifier)
        
        return ctx
    
    def _send_completion_summary(self, ctx: PipelineContext, notifier):
        """發送完成摘要通知"""
        days = ctx.args.days if hasattr(ctx.args, 'days') else 250
        
        summary = {
            'etf_code': ctx.etf_code,
            'data_date': ctx.date_str,
            'total_holdings': len(ctx.df) if ctx.df is not None else 0,
            'sync_days': days,
            'diff_stats': self._compute_diff_stats(ctx.diff_logs),
            'top_changes': self._get_top_changes(ctx.diff_logs, top_n=10),
            'market_signals': self._extract_market_signals(ctx.df)
        }
        
        notifier.notify_completion(summary)
        self.logger.info("Completion notification sent with full summary and market signals.")
    
    def _compute_diff_stats(self, diff_logs):
        """計算異動統計"""
        if not diff_logs:
            return {
                'total_changes': 0,
                'new_in': 0,
                'removed': 0,
                'adjusted': 0
            }
        
        return {
            'total_changes': len(diff_logs),
            'new_in': len([d for d in diff_logs if d['change_type'] == 'IN']),
            'removed': len([d for d in diff_logs if d['change_type'] == 'OUT']),
            'adjusted': len([d for d in diff_logs if d['change_type'] in ['BUY', 'SELL']])
        }
    
    def _get_top_changes(self, diff_logs, top_n=10):
        """取得 TOP N 權重變化"""
        if not diff_logs:
            return []
        
        sorted_changes = sorted(
            diff_logs,
            key=lambda x: abs(x.get('diff_weight', 0)),
            reverse=True
        )
        
        return [
            {
                'stock_name': d.get('stock_name', 'N/A'),
                'stock_code': d.get('stock_code', 'N/A'),
                'diff_weight': d.get('diff_weight', 0),
                'change_type': d.get('change_type', 'ADJUST')
            }
            for d in sorted_changes[:top_n]
        ]

    def _extract_market_signals(self, df: pd.DataFrame) -> Dict[str, List[Dict[str, Any]]]:
        """
        從持股資料中提取市場訊號：
        1. 營收爆發 (YoY > 20%)
        2. 強勢突破 (200日/20日/5日新高)
        3. 營收衰退警示 (YoY < -20%)
        """
        if df is None or df.empty:
            return {}
        
        signals = {
            'revenue_up': [],
            'revenue_down': [],
            'breakout_200': [],
            'breakout_20': [],
            'breakout_5': []
        }
        
        try:
            # 1. 營收爆發 (YoY > 20%)
            if 'revenue_yoy' in df.columns:
                up_mask = (df['revenue_yoy'] > 20)
                up_stocks = df[up_mask].sort_values('revenue_yoy', ascending=False).head(3)
                signals['revenue_up'] = [
                    {
                        'name': row.get('name', 'N/A'),
                        'code': row.get('code', 'N/A'),
                        'value': f"{row['revenue_yoy']:+.1f}%"
                    }
                    for _, row in up_stocks.iterrows()
                ]

            # 2. 強勢突破 (200日/20日/5日新高)
            for window in [200, 20, 5]:
                col = f'is_high_{window}d'
                key = f'breakout_{window}'
                
                if col in df.columns:
                    breakout_mask = (df[col] == True)
                    # For breakout, maybe sort by diff_weight if available? Or random? 
                    # Existing logic used head(3). Let's stick to head(3) or maybe sort by something meaningful if possible.
                    # Since we don't have weight easily here without joining, head(3) is fine.
                    breakout_stocks = df[breakout_mask].head(3)
                    signals[key] = [
                        {
                            'name': row.get('name', 'N/A'),
                            'code': row.get('code', 'N/A'),
                            'value': f"{window}日新高"
                        }
                        for _, row in breakout_stocks.iterrows()
                    ]
            
            # 3. 營收衰退警示 (YoY < -20%)
            if 'revenue_yoy' in df.columns:
                down_mask = (df['revenue_yoy'] < -20)
                down_stocks = df[down_mask].sort_values('revenue_yoy', ascending=True).head(3) # 取衰退最多的
                signals['revenue_down'] = [
                    {
                        'name': row.get('name', 'N/A'),
                        'code': row.get('code', 'N/A'),
                        'value': f"{row['revenue_yoy']:+.1f}%"
                    }
                    for _, row in down_stocks.iterrows()
                ]
                
        except Exception as e:
            self.logger.error(f"Error extracting market signals: {e}")
            
        return signals
