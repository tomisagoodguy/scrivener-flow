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
        1. 營收爆發 (YoY Top 10, MoM Top 10, 雙成長)
        2. 強勢突破 (200日/20日/5日新高 - 列出全部)
        3. 成交金額 Top 10
        """
        if df is None or df.empty:
            return {}
        
        signals = {
            'revenue_yoy_top10': [],
            'revenue_mom_top10': [],
            'revenue_double_growth': [],
            'breakout_200': [],
            'breakout_20': [],
            'breakout_5': [],
            'amount_top10': [],
        }
        
        try:
            # Helper to format list
            def _format_list(sub_df, value_col, fmt="{:+.1f}%"):
                return [
                    {
                        'name': row.get('name', 'N/A'),
                        'code': row.get('code', 'N/A'),
                        'value': fmt.format(row[value_col]) if pd.notnull(row[value_col]) else "N/A"
                    }
                    for _, row in sub_df.iterrows()
                ]

            # 1. 營收訊號
            if 'revenue_yoy' in df.columns:
                # YoY Top 10
                yoy_df = df[df['revenue_yoy'].notnull()].sort_values('revenue_yoy', ascending=False).head(10)
                signals['revenue_yoy_top10'] = _format_list(yoy_df, 'revenue_yoy')

            if 'revenue_mom' in df.columns:
                # MoM Top 10
                mom_df = df[df['revenue_mom'].notnull()].sort_values('revenue_mom', ascending=False).head(10)
                signals['revenue_mom_top10'] = _format_list(mom_df, 'revenue_mom')

            if 'revenue_yoy' in df.columns and 'revenue_mom' in df.columns:
                # Double Growth: YoY > 0 AND MoM > 0, sorted by sum
                mask_double = (df['revenue_yoy'] > 0) & (df['revenue_mom'] > 0)
                double_df = df[mask_double].copy()
                if not double_df.empty:
                    double_df['combined_growth'] = double_df['revenue_yoy'] + double_df['revenue_mom']
                    double_top10 = double_df.sort_values('combined_growth', ascending=False).head(10)
                    signals['revenue_double_growth'] = [
                         {
                            'name': row.get('name', 'N/A'),
                            'code': row.get('code', 'N/A'),
                            'value': f"Y:{row['revenue_yoy']:.1f}%/M:{row['revenue_mom']:.1f}%"
                        }
                        for _, row in double_top10.iterrows()
                    ]

            # 2. 強勢突破 (200日/20日/5日新高) - ALL
            for window in [200, 20, 5]:
                col = f'is_high_{window}d'
                key = f'breakout_{window}'
                
                if col in df.columns:
                    breakout_mask = (df[col] == True)
                    breakout_stocks = df[breakout_mask] # No limit
                    signals[key] = [
                        {
                            'name': row.get('name', 'N/A'),
                            'code': row.get('code', 'N/A'),
                            'value': f"{window}日新高"
                        }
                        for _, row in breakout_stocks.iterrows()
                    ]
            
            # 3. 成交金額 Top 10
            if 'amount' in df.columns:
                amount_df = df[df['amount'].notnull()].sort_values('amount', ascending=False).head(10)
                
                def fmt_amount(val):
                    if pd.isna(val): return "N/A"
                    if val >= 100000000:
                        return f"{val/100000000:.2f}億"
                    elif val >= 10000:
                        return f"{val/10000:.0f}萬"
                    return str(val)

                signals['amount_top10'] = [
                    {
                        'name': row.get('name', 'N/A'),
                        'code': row.get('code', 'N/A'),
                        'value': fmt_amount(row['amount'])
                    }
                    for _, row in amount_df.iterrows()
                ]

        except Exception as e:
            self.logger.error(f"Error extracting market signals: {e}")
            
        return signals
