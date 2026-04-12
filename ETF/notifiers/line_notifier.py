import os
import logging
import json
import requests
from typing import List, Dict, Any
from ETF.notifiers.message_builder import DiffMessageBuilder, SummaryMessageBuilder

logger = logging.getLogger(__name__)

class LineNotifier:
    def __init__(self, token_env="LINE_CHANNEL_ACCESS_TOKEN", user_id_env="LINE_USER_ID"):
        from dotenv import load_dotenv
        if os.path.exists('.env.local'):
            load_dotenv('.env.local')
        else:
            load_dotenv()

        # Load from env
        self.channel_token = os.getenv(token_env)
        self.user_id = os.getenv(user_id_env)
        self.api_url = "https://api.line.me/v2/bot/message/push"
        self.broadcast_api_url = "https://api.line.me/v2/bot/message/broadcast"

        if not self.channel_token:
            logger.warning(f"LINE Token ({token_env}) missing. Notification disabled.")
        if not self.user_id:
            logger.info(f"LINE User ID ({user_id_env}) not set. Push notification only available if set.")

    def send_text(self, text: str):
        """發送簡單純文字訊息 (Push to User ID)"""
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
                logger.error(f"Failed to send LINE text: {resp.status_code} {resp.text}")
        except Exception as e:
            logger.error(f"Error sending LINE text: {e}")

    def broadcast_text(self, text: str):
        """廣播簡單純文字訊息 (Broadcast to All)"""
        if not self.channel_token:
            return

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.channel_token}"
        }
        
        payload = {
            "messages": [
                {
                    "type": "text",
                    "text": text
                }
            ]
        }
        
        try:
            resp = requests.post(self.broadcast_api_url, headers=headers, json=payload, timeout=10)
            if resp.status_code == 200:
                logger.info("LINE broadcast text message sent successfully.")
            else:
                logger.error(f"Failed to broadcast LINE text: {resp.status_code} {resp.text}")
        except Exception as e:
            logger.error(f"Error broadcasting LINE text: {e}")

    def send_flex_message(self, alt_text: str, contents: Dict[str, Any]):
        """發送 Flex Message (Push to User ID)"""
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
                logger.error(f"Failed to send LINE: {resp.status_code} {resp.text}")
        except Exception as e:
            logger.error(f"Error sending LINE: {e}")

    def broadcast_flex_message(self, alt_text: str, contents: Dict[str, Any]):
        """廣播 Flex Message (Broadcast to All)"""
        if not self.channel_token:
            return

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.channel_token}"
        }
        
        payload = {
            "messages": [
                {
                    "type": "flex",
                    "altText": alt_text,
                    "contents": contents
                }
            ]
        }
        
        try:
            resp = requests.post(self.broadcast_api_url, headers=headers, json=payload, timeout=10)
            if resp.status_code == 200:
                logger.info("LINE broadcast notification sent successfully.")
            else:
                logger.error(f"Failed to broadcast LINE: {resp.status_code} {resp.text}")
        except Exception as e:
            logger.error(f"Error broadcasting LINE: {e}")

    def notify_diffs(self, diff_logs: List[Dict[str, Any]], etf_code: str, date_str: str):
        """
        Analyze diff logs and send notification for All changes (IN/OUT/BUY/SELL).
        Uses Broadcast API.
        """
        if not diff_logs:
            return

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
                self.broadcast_text(msg)
            return

        # Use Builder
        bubble = DiffMessageBuilder.build(etf_code, date_str, diff_logs)
        if bubble:
            self.broadcast_flex_message(f"{etf_code} 持股異動通知", bubble)
    
    def notify_completion(self, summary: Dict[str, Any]):
        """
        發送數據同步完成通知，包含詳細摘要資訊
        Uses Broadcast API.
        
        Args:
            summary: 摘要數據字典
        """
        if not summary:
            logger.warning("Summary is empty. Skipping completion notification.")
            return
        
        etf_code = summary.get('etf_code', 'N/A')
        data_date = summary.get('data_date', 'N/A')
        total_holdings = summary.get('total_holdings', 0)
        sync_days = summary.get('sync_days', 0)
        diff_stats = summary.get('diff_stats', {})
        
        # Use Builder
        bubble = SummaryMessageBuilder.build(summary)
        
        # 發送 Flex Message
        try:
            self.broadcast_flex_message(f"{etf_code} 同步完成", bubble)
            logger.info("Completion notification sent successfully.")
        except Exception as e:
            logger.error(f"Failed to send completion notification: {e}")
            # Fallback: 發送純文字訊息
            try:
                fallback_msg = f"✅ {etf_code} 數據同步完成\n📅 {data_date}\n📊 持股: {total_holdings} 檔\n⚙️ 範圍: {sync_days} 天"
                if diff_stats and diff_stats.get('total_changes', 0) > 0:
                    fallback_msg += f"\n\n異動: 新增 {diff_stats.get('new_in', 0)} / 剔除 {diff_stats.get('removed', 0)} / 調整 {diff_stats.get('adjusted', 0)}"
                self.broadcast_text(fallback_msg)
                logger.info("Fallback text notification sent.")
            except Exception as fallback_error:
                logger.error(f"Fallback notification also failed: {fallback_error}")

    def broadcast_ai_report(self, ai_report: str):
        """廣播 AI 分析報告 (Broadcast to All)"""
        if not self.channel_token:
            return
        
        # 簡單處理過長的報告，分段發送 (LINE 上限 5000 字)
        MAX_LENGTH = 3000 # 保留一些 buffer
        if len(ai_report) > MAX_LENGTH:
            ai_report = ai_report[:MAX_LENGTH] + "\n...(報告過長，請至網站查看完整版)"

        msg = f"🤖 AI 每日投資分析報告\n\n{ai_report}"
        self.broadcast_text(msg)
