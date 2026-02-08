"""
Notify Step

負責發送 LINE 通知（異動通知與完成摘要）。
"""

from .base import BaseStep
from ETF.pipeline.context import PipelineContext


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
        
        # 2. 發送完成摘要
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
            'top_changes': self._get_top_changes(ctx.diff_logs)
        }
        
        notifier.notify_completion(summary)
        self.logger.info("Completion notification sent with full summary.")
    
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
    
    def _get_top_changes(self, diff_logs, top_n=5):
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
