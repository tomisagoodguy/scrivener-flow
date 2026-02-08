import os
import logging
import json
import requests
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

class LineNotifier:
    def __init__(self):
        from dotenv import load_dotenv
        if os.path.exists('.env.local'):
            load_dotenv('.env.local')
        else:
            load_dotenv()

        # Load from env
        self.channel_token = os.getenv("LINE_CHANNEL_ACCESS_TOKEN")
        self.user_id = os.getenv("LINE_USER_ID")
        self.api_url = "https://api.line.me/v2/bot/message/push"

        if not self.channel_token or not self.user_id:
            logger.warning("LINE credentials missing. Notification disabled.")

    def send_text(self, text: str):
        """發送簡單純文字訊息"""
        if not self.channel_token or not self.user_id:
            return

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.channel_token}"
        }
        
        payload = {
            "to": self.user_id,
            "messages": [
                {
                    "type": "text",
                    "text": text
                }
            ]
        }
        
        try:
            resp = requests.post(self.api_url, headers=headers, json=payload, timeout=10)
            if resp.status_code == 200:
                logger.info("LINE text message sent successfully.")
            else:
                logger.error(f"Failed to send LINE text: {resp.text}")
        except Exception as e:
            logger.error(f"Error sending LINE text: {e}")

    def send_flex_message(self, alt_text: str, contents: Dict[str, Any]):
        if not self.channel_token or not self.user_id:
            return

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.channel_token}"
        }
        
        payload = {
            "to": self.user_id,
            "messages": [
                {
                    "type": "flex",
                    "altText": alt_text,
                    "contents": contents
                }
            ]
        }
        
        try:
            resp = requests.post(self.api_url, headers=headers, json=payload, timeout=10)
            if resp.status_code == 200:
                logger.info("LINE notification sent successfully.")
            else:
                logger.error(f"Failed to send LINE: {resp.text}")
        except Exception as e:
            logger.error(f"Error sending LINE: {e}")

    def notify_diffs(self, diff_logs: List[Dict[str, Any]], etf_code: str, date_str: str):
        """
        Analyze diff logs and send notification if critical changes (IN/OUT) occur.
        """
        if not diff_logs:
            return

        # Filtering: Only care about IN/OUT for now
        in_stocks = [d for d in diff_logs if d['change_type'] == 'IN']
        out_stocks = [d for d in diff_logs if d['change_type'] == 'OUT']
        
        if not in_stocks and not out_stocks:
            logger.info("No IN/OUT changes. Sending summary of BUY/SELL.")
            # Send a simple text summary for BUY/SELL
            buy_stocks = [d for d in diff_logs if d['change_type'] == 'BUY']
            sell_stocks = [d for d in diff_logs if d['change_type'] == 'SELL']
            
            if buy_stocks or sell_stocks:
                msg = f"📊 {etf_code} 持股權重調整 ({date_str})\n"
                msg += "名單無異動，僅權重調整。\n"
                if buy_stocks:
                    msg += f"📈 增持: {', '.join([s['stock_name'] for s in buy_stocks[:5]])} 等 {len(buy_stocks)} 檔\n"
                if sell_stocks:
                    msg += f"📉 減持: {', '.join([s['stock_name'] for s in sell_stocks[:5]])} 等 {len(sell_stocks)} 檔"
                self.send_text(msg)
            return

        # Construct Flex Message
        # Design: Bubble -> Header (Purple) -> Body (List)
        
        rows = []
        
        # Section: IN
        if in_stocks:
            rows.append({
                "type": "text",
                "text": "🚀 新增成分股",
                "weight": "bold",
                "color": "#1DB446",
                "size": "sm",
                "margin": "md"
            })
            for s in in_stocks:
                rows.append({
                    "type": "box",
                    "layout": "horizontal",
                    "contents": [
                        {"type": "text", "text": f"{s['stock_name']}", "size": "sm", "flex": 4},
                        {"type": "text", "text": f"{s['stock_code']}", "size": "xs", "color": "#aaaaaa", "flex": 2, "align": "end"},
                        {"type": "text", "text": f"{s['diff_weight']}%", "size": "sm", "align": "end", "flex": 2}
                    ]
                })

        # Section: OUT
        if out_stocks:
            rows.append({
                "type": "text",
                "text": "🗑️ 剔除成分股",
                "weight": "bold",
                "color": "#FF334B",
                "size": "sm",
                "margin": "md"
            })
            for s in out_stocks:
                rows.append({
                    "type": "box",
                    "layout": "horizontal",
                    "contents": [
                        {"type": "text", "text": f"{s['stock_name']}", "size": "sm", "flex": 4, "color": "#999999", "decoration": "line-through"},
                        {"type": "text", "text": f"{s['stock_code']}", "size": "xs", "color": "#aaaaaa", "flex": 2, "align": "end"},
                        {"type": "text", "text": f"OUT", "size": "sm", "align": "end", "flex": 2, "color": "#FF334B"}
                    ]
                })

        bubble = {
            "type": "bubble",
            "header": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    {
                        "type": "text",
                        "text": f"📊 {etf_code} 持股異動",
                        "weight": "bold",
                        "size": "lg",
                        "color": "#ffffff"
                    },
                    {
                        "type": "text",
                        "text": f"日期: {date_str}",
                        "size": "xs",
                        "color": "#ffffffcc",
                        "margin": "xs"
                    }
                ],
                "backgroundColor": "#0F172A" # Slate 900
            },
            "body": {
                "type": "box",
                "layout": "vertical",
                "contents": rows
            },
            "footer": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    {
                        "type": "button",
                        "action": {
                            "type": "uri",
                            "label": "查看詳細資訊",
                            "uri": "https://scrivener-flow.vercel.app/investment" # TODO: Real URL
                        },
                        "style": "secondary",
                        "height": "sm"
                    }
                ]
            }
        }
        
        self.send_flex_message(f"{etf_code} 持股異動通知", bubble)
    
    def notify_completion(self, summary: Dict[str, Any]):
        """
        發送數據同步完成通知，包含詳細摘要資訊
        
        Args:
            summary: 摘要數據字典，包含:
                - etf_code: ETF 代碼
                - data_date: 資料日期
                - total_holdings: 持股總數
                - sync_days: 同步範圍（天數）
                - diff_stats: 異動統計 (total_changes, new_in, removed, adjusted)
                - top_changes: TOP 5 權重變化 (optional)
        """
        if not summary:
            logger.warning("Summary is empty. Skipping completion notification.")
            return
        
        etf_code = summary.get('etf_code', 'N/A')
        data_date = summary.get('data_date', 'N/A')
        total_holdings = summary.get('total_holdings', 0)
        sync_days = summary.get('sync_days', 0)
        diff_stats = summary.get('diff_stats', {})
        top_changes = summary.get('top_changes', [])
        
        # 構建 Flex Message Body
        rows = []
        
        # 基本資訊區塊
        rows.append({
            "type": "box",
            "layout": "horizontal",
            "contents": [
                {"type": "text", "text": "持股總數", "size": "sm", "color": "#94A3B8", "flex": 0},
                {"type": "text", "text": f"{total_holdings} 檔", "size": "sm", "align": "end", "weight": "bold", "color": "#0F172A"}
            ],
            "margin": "md"
        })
        
        rows.append({
            "type": "box",
            "layout": "horizontal",
            "contents": [
                {"type": "text", "text": "同步範圍", "size": "sm", "color": "#94A3B8", "flex": 0},
                {"type": "text", "text": f"{sync_days} 天", "size": "sm", "align": "end", "weight": "bold", "color": "#0F172A"}
            ],
            "margin": "sm"
        })
        
        # 異動統計區塊
        if diff_stats and diff_stats.get('total_changes', 0) > 0:
            rows.append({
                "type": "separator",
                "margin": "md"
            })
            
            rows.append({
                "type": "text",
                "text": "📊 異動統計",
                "weight": "bold",
                "color": "#0F172A",
                "size": "sm",
                "margin": "md"
            })
            
            # 新增
            if diff_stats.get('new_in', 0) > 0:
                rows.append({
                    "type": "box",
                    "layout": "horizontal",
                    "contents": [
                        {"type": "text", "text": "🚀 新增成分股", "size": "sm", "color": "#10B981", "flex": 0},
                        {"type": "text", "text": f"{diff_stats['new_in']} 檔", "size": "sm", "align": "end", "weight": "bold", "color": "#10B981"}
                    ],
                    "margin": "sm"
                })
            
            # 剔除
            if diff_stats.get('removed', 0) > 0:
                rows.append({
                    "type": "box",
                    "layout": "horizontal",
                    "contents": [
                        {"type": "text", "text": "🗑️ 剔除成分股", "size": "sm", "color": "#EF4444", "flex": 0},
                        {"type": "text", "text": f"{diff_stats['removed']} 檔", "size": "sm", "align": "end", "weight": "bold", "color": "#EF4444"}
                    ],
                    "margin": "sm"
                })
            
            # 調整
            if diff_stats.get('adjusted', 0) > 0:
                rows.append({
                    "type": "box",
                    "layout": "horizontal",
                    "contents": [
                        {"type": "text", "text": "⚖️ 權重調整", "size": "sm", "color": "#F59E0B", "flex": 0},
                        {"type": "text", "text": f"{diff_stats['adjusted']} 檔", "size": "sm", "align": "end", "weight": "bold", "color": "#F59E0B"}
                    ],
                    "margin": "sm"
                })
        else:
            rows.append({
                "type": "separator",
                "margin": "md"
            })
            rows.append({
                "type": "text",
                "text": "✅ 無成分股異動",
                "size": "sm",
                "color": "#64748B",
                "margin": "md",
                "align": "center"
            })
        
        # TOP 5 權重變化（若有）
        if top_changes and len(top_changes) > 0:
            rows.append({
                "type": "separator",
                "margin": "md"
            })
            
            rows.append({
                "type": "text",
                "text": "📈 TOP 5 權重變化",
                "weight": "bold",
                "color": "#0F172A",
                "size": "sm",
                "margin": "md"
            })
            
            for change in top_changes[:5]:  # 確保最多 5 個
                stock_name = change.get('stock_name', 'N/A')
                diff_weight = change.get('diff_weight', 0)
                change_type = change.get('change_type', 'ADJUST')
                
                # 根據類型決定顏色
                if change_type == 'IN':
                    color = "#10B981"
                    symbol = "🆕"
                elif change_type == 'OUT':
                    color = "#EF4444"
                    symbol = "❌"
                elif diff_weight > 0:
                    color = "#10B981"
                    symbol = "📈"
                else:
                    color = "#EF4444"
                    symbol = "📉"
                
                rows.append({
                    "type": "box",
                    "layout": "horizontal",
                    "contents": [
                        {"type": "text", "text": f"{symbol} {stock_name}", "size": "xs", "flex": 3, "color": "#334155"},
                        {"type": "text", "text": f"{diff_weight:+.2f}%", "size": "xs", "align": "end", "weight": "bold", "color": color, "flex": 1}
                    ],
                    "margin": "sm"
                })
        
        # 構建完整 Bubble
        bubble = {
            "type": "bubble",
            "header": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    {
                        "type": "text",
                        "text": f"✅ {etf_code} 數據同步完成",
                        "weight": "bold",
                        "size": "lg",
                        "color": "#FFFFFF"
                    },
                    {
                        "type": "text",
                        "text": f"📅 資料日期: {data_date}",
                        "size": "xs",
                        "color": "#FFFFFFCC",
                        "margin": "xs"
                    }
                ],
                "backgroundColor": "#10B981",  # Emerald 500 - 成功綠
                "paddingAll": "16px"
            },
            "body": {
                "type": "box",
                "layout": "vertical",
                "contents": rows,
                "paddingAll": "16px"
            },
            "footer": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    {
                        "type": "button",
                        "action": {
                            "type": "uri",
                            "label": "查看詳細資訊",
                            "uri": "https://scrivener-flow.vercel.app/investment"
                        },
                        "style": "primary",
                        "color": "#0EA5E9",
                        "height": "sm"
                    }
                ],
                "paddingAll": "12px"
            }
        }
        
        # 發送 Flex Message
        try:
            self.send_flex_message(f"{etf_code} 同步完成", bubble)
            logger.info("Completion notification sent successfully.")
        except Exception as e:
            logger.error(f"Failed to send completion notification: {e}")
            # Fallback: 發送純文字訊息
            try:
                fallback_msg = f"✅ {etf_code} 數據同步完成\n📅 {data_date}\n📊 持股: {total_holdings} 檔\n⚙️ 範圍: {sync_days} 天"
                if diff_stats and diff_stats.get('total_changes', 0) > 0:
                    fallback_msg += f"\n\n異動: 新增 {diff_stats.get('new_in', 0)} / 剔除 {diff_stats.get('removed', 0)} / 調整 {diff_stats.get('adjusted', 0)}"
                self.send_text(fallback_msg)
                logger.info("Fallback text notification sent.")
            except Exception as fallback_error:
                logger.error(f"Fallback notification also failed: {fallback_error}")
