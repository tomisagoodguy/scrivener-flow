import os
import logging
import json
import requests
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

class LineNotifier:
    def __init__(self):
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
            logger.info("No IN/OUT changes. Skipping notification.")
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
