import os
import requests
from dotenv import load_dotenv

# Load env
if os.path.exists('.env.local'):
    load_dotenv('.env.local')
else:
    load_dotenv()

def test_line():
    channel_token = os.getenv("LINE_CHANNEL_ACCESS_TOKEN")
    user_id = os.getenv("LINE_USER_ID")
    api_url = "https://api.line.me/v2/bot/message/push"

    print(f"Token: {channel_token[:10]}...")
    print(f"User ID: {user_id[:10]}...")

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {channel_token}"
    }
    
    payload = {
        "to": user_id,
        "messages": [
            {
                "type": "text",
                "text": "🤖 [Test] Antigravity LINE Notification Test"
            }
        ]
    }
    
    resp = requests.post(api_url, headers=headers, json=payload)
    print(f"Status: {resp.status_code}")
    print(f"Response: {resp.text}")

if __name__ == "__main__":
    test_line()
