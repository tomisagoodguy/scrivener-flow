"""
Flex Message Builders

負責建構 LINE Flex Messages 的 UI 邏輯。
將視覺呈現層 (Presentation) 與發送層 (Transport) 分離，避免 LineNotifier 過度膨脹。
"""

from typing import List, Dict, Any

class FlexMessageBuilder:
    """Flex Message 建構器基類"""
    
    @staticmethod
    def _text(text: str, **kwargs) -> Dict[str, Any]:
        """建立 Text Component"""
        base = {"type": "text", "text": str(text)}
        base.update(kwargs)
        return base

    @staticmethod
    def _box_vertical(contents: List[Dict[str, Any]], **kwargs) -> Dict[str, Any]:
        """建立 Vertical Box"""
        base = {"type": "box", "layout": "vertical", "contents": contents}
        base.update(kwargs)
        return base

    @staticmethod
    def _box_horizontal(contents: List[Dict[str, Any]], **kwargs) -> Dict[str, Any]:
        """建立 Horizontal Box"""
        base = {"type": "box", "layout": "horizontal", "contents": contents}
        base.update(kwargs)
        return base
    
    @staticmethod
    def _separator(**kwargs) -> Dict[str, Any]:
        """建立 Separator"""
        base = {"type": "separator"}
        base.update(kwargs)
        return base

    @staticmethod
    def _button_uri(label: str, uri: str, **kwargs) -> Dict[str, Any]:
        """建立 URI Button"""
        base = {
            "type": "button",
            "action": {"type": "uri", "label": label, "uri": uri},
            "height": "sm"
        }
        base.update(kwargs)
        return base


class DiffMessageBuilder(FlexMessageBuilder):
    """建構持股異動通知"""

    @classmethod
    def build(cls, etf_code: str, date_str: str, diff_logs: List[Dict[str, Any]]) -> Dict[str, Any]:
        if not diff_logs:
            return None

        # 只顯示顯著異動，過濾 TRIM（微調）
        significant = [d for d in diff_logs if d.get('is_significant', True) and d['change_type'] != 'TRIM']

        if not significant:
            return None

        # Categorize
        in_stocks    = [d for d in significant if d['change_type'] == 'IN']
        out_stocks   = [d for d in significant if d['change_type'] == 'OUT']
        close_stocks = [d for d in significant if d['change_type'] == 'CLOSE']
        buy_stocks   = [d for d in significant if d['change_type'] == 'BUY']
        sell_stocks  = [d for d in significant if d['change_type'] == 'SELL']

        # Sort by abs weight change
        buy_stocks.sort(key=lambda x: abs(x.get('diff_weight', 0)), reverse=True)
        sell_stocks.sort(key=lambda x: abs(x.get('diff_weight', 0)), reverse=True)

        rows = []

        def _weight_label(s: Dict[str, Any], show_prev: bool = False) -> str:
            """格式化權重變動標籤，若有前後值則顯示 prev→curr"""
            prev = s.get('prev_weight')
            curr = s.get('curr_weight')
            diff = s.get('diff_weight', 0)
            if show_prev and prev is not None and curr is not None:
                return f"{prev:.2f}%→{curr:.2f}%"
            return f"{diff:+.2f}%"

        def _add_section(title, stocks, color, icon, is_out=False, show_prev=False):
            if not stocks:
                return

            rows.append(cls._text(f"{icon} {title}", weight="bold", color=color, size="sm", margin="md"))

            display_list = stocks[:10]
            for s in display_list:
                name_style: Dict[str, Any] = {"size": "sm", "flex": 4, "color": "#333333"}
                if is_out:
                    name_style["decoration"] = "line-through"
                    name_style["color"] = "#999999"

                rows.append(cls._box_horizontal([
                    cls._text(s['stock_name'], **name_style),
                    cls._text(s['stock_code'], size="xs", color="#aaaaaa", flex=2, align="end"),
                    cls._text(_weight_label(s, show_prev), size="sm", align="end", flex=3, color=color),
                ]))

            if len(stocks) > 10:
                rows.append(cls._text(f"...還有 {len(stocks)-10} 檔", size="xs", color="#aaaaaa", align="end"))

        # Build Sections
        _add_section("新增成分股", in_stocks, "#1DB446", "🚀")
        _add_section("剔除成分股", out_stocks, "#FF334B", "🗑️", is_out=True)
        _add_section("近乎清倉 ⚠️", close_stocks, "#DC2626", "🚨", is_out=True, show_prev=True)
        _add_section("權重加碼 (Top 10)", buy_stocks, "#F59E0B", "📈", show_prev=True)
        _add_section("權重減碼 (Top 10)", sell_stocks, "#64748B", "📉", show_prev=True)

        if not rows:
            return None

        return {
            "type": "bubble",
            "header": cls._box_vertical([
                cls._text(f"📊 {etf_code} 持股異動", weight="bold", size="lg", color="#ffffff"),
                cls._text(f"日期: {date_str}", size="xs", color="#ffffffcc", margin="xs")
            ], backgroundColor="#0F172A"),
            "body": cls._box_vertical(rows),
            "footer": cls._box_vertical([
                cls._button_uri("查看詳細資訊", "https://scrivener-flow.vercel.app/investment", style="secondary")
            ])
        }


class SummaryMessageBuilder(FlexMessageBuilder):
    """建構每日摘要通知"""

    @classmethod
    def build(cls, summary: Dict[str, Any]) -> Dict[str, Any]:
        etf_code = summary.get('etf_code', 'N/A')
        data_date = summary.get('data_date', 'N/A')
        total_holdings = summary.get('total_holdings', 0)
        sync_days = summary.get('sync_days', 0)
        diff_stats = summary.get('diff_stats', {})
        market_signals = summary.get('market_signals', {})

        rows = []
        
        # 1. 基本資訊
        rows.append(cls._box_horizontal([
            cls._text("持股總數", size="sm", color="#94A3B8", flex=0),
            cls._text(f"{total_holdings} 檔", size="sm", align="end", weight="bold", color="#0F172A")
        ], margin="md"))
        
        rows.append(cls._box_horizontal([
            cls._text("同步範圍", size="sm", color="#94A3B8", flex=0),
            cls._text(f"{sync_days} 天", size="sm", align="end", weight="bold", color="#0F172A")
        ], margin="sm"))

        # 2. 異動統計
        if diff_stats and diff_stats.get('total_changes', 0) > 0:
            rows.append(cls._separator(margin="md"))
            rows.append(cls._text("📊 異動統計", weight="bold", color="#0F172A", size="sm", margin="md"))
            
            def _stat_row(label, val, color):
                if val > 0:
                    rows.append(cls._box_horizontal([
                        cls._text(label, size="sm", color=color, flex=0),
                        cls._text(f"{val} 檔", size="sm", align="end", weight="bold", color=color)
                    ], margin="sm"))

            _stat_row("🚀 新增", diff_stats.get('new_in', 0), "#10B981")
            _stat_row("🗑️ 剔除", diff_stats.get('removed', 0), "#EF4444")
            _stat_row("⚖️ 調整", diff_stats.get('adjusted', 0), "#F59E0B")
        else:
            rows.append(cls._separator(margin="md"))
            rows.append(cls._text("✅ 無成分股異動", size="sm", color="#64748B", margin="md", align="center"))

        # 3. 市場焦點 (Signals)
        signal_keys = ['revenue_yoy_top10', 'revenue_mom_top10', 'revenue_double_growth', 
                       'breakout_200', 'breakout_20', 'breakout_5', 'amount_top10']
        
        has_signals = any(market_signals.get(k) for k in signal_keys)

        if has_signals:
            rows.append(cls._separator(margin="md"))
            rows.append(cls._text("🎯 市場焦點", weight="bold", color="#0F172A", size="sm", margin="md"))

            def _add_signal_section(title, key, color="#EF4444"):
                items = market_signals.get(key, [])
                if not items: return
                
                rows.append(cls._text(title, size="xs", color="#64748B", margin="sm"))
                
                for s in items:
                    rows.append(cls._box_horizontal([
                        cls._text(s['name'], size="xs", flex=0, color="#334155", weight="bold", 
                                  action={"type": "uri", "label": "G", "uri": f"https://www.google.com/search?q={s['code']}+TW"}),
                        cls._text(s['value'], size="xs", align="end", color=color, flex=1)
                    ], margin="xs"))

            # 雙成長
            _add_signal_section("🔥 營收雙成長 (MoM & YoY)", 'revenue_double_growth', "#D946EF")
            # 營收排行
            _add_signal_section("🚀 營收年增 Top 10", 'revenue_yoy_top10', "#EF4444")
            _add_signal_section("📈 營收月增 Top 10", 'revenue_mom_top10', "#F59E0B")
            # 成交金額
            _add_signal_section("💰 成交金額 Top 10", 'amount_top10', "#3B82F6")
            # 突破
            _add_signal_section("🌟 200日新高", 'breakout_200', "#EF4444")
            _add_signal_section("💪 20日新高", 'breakout_20', "#F59E0B")
            _add_signal_section("⚡ 5日新高", 'breakout_5', "#10B981")

        return {
            "type": "bubble",
            "header": cls._box_vertical([
                cls._text(f"✅ {etf_code} 數據同步完成", weight="bold", size="lg", color="#FFFFFF"),
                cls._text(f"📅 資料日期: {data_date}", size="xs", color="#FFFFFFCC", margin="xs")
            ], backgroundColor="#10B981", paddingAll="16px"),
            "body": cls._box_vertical(rows, paddingAll="16px"),
            "footer": cls._box_vertical([
                cls._button_uri("查看詳細資訊", "https://scrivener-flow.vercel.app/investment", style="primary", color="#0EA5E9")
            ], paddingAll="12px")
        }



