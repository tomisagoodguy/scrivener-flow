"""
測試 Enhanced LINE Notification 功能

此腳本用於本地測試新的 notify_completion() 方法
"""

import sys
sys.path.insert(0, 'ETF')

from notifiers.line_notifier import LineNotifier

def test_notify_completion():
    """測試完成通知功能"""
    
    # 1. 初始化 LINE Notifier
    notifier = LineNotifier()
    
    # 2. 模擬摘要數據（有異動情況）
    summary_with_changes = {
        'etf_code': '0050',
        'data_date': '2026-02-03',
        'total_holdings': 50,
        'sync_days': 30,
        'diff_stats': {
            'total_changes': 8,
            'new_in': 2,
            'removed': 1,
            'adjusted': 5
        },
        'top_changes': [
            {
                'stock_name': '台積電',
                'stock_code': '2330',
                'diff_weight': 2.35,
                'change_type': 'BUY'
            },
            {
                'stock_name': '聯發科',
                'stock_code': '2454',
                'diff_weight': -1.82,
                'change_type': 'SELL'
            },
            {
                'stock_name': '鴻海',
                'stock_code': '2317',
                'diff_weight': 0.95,
                'change_type': 'IN'
            },
            {
                'stock_name': '聯電',
                'stock_code': '2303',
                'diff_weight': -0.73,
                'change_type': 'SELL'
            },
            {
                'stock_name': '台達電',
                'stock_code': '2308',
                'diff_weight': 0.68,
                'change_type': 'BUY'
            }
        ]
    }
    
    # 3. 模擬摘要數據（無異動情況）
    summary_no_changes = {
        'etf_code': '0056',
        'data_date': '2026-02-03',
        'total_holdings': 30,
        'sync_days': 30,
        'diff_stats': {
            'total_changes': 0,
            'new_in': 0,
            'removed': 0,
            'adjusted': 0
        },
        'top_changes': []
    }
    
    print("📤 測試 1: 發送有異動的完成通知...")
    try:
        notifier.notify_completion(summary_with_changes)
        print("✅ 有異動通知發送成功！")
    except Exception as e:
        print(f"❌ 有異動通知發送失敗: {e}")
    
    print("\n" + "="*50 + "\n")
    
    print("📤 測試 2: 發送無異動的完成通知...")
    try:
        notifier.notify_completion(summary_no_changes)
        print("✅ 無異動通知發送成功！")
    except Exception as e:
        print(f"❌ 無異動通知發送失敗: {e}")

if __name__ == "__main__":
    print("🧪 開始測試 Enhanced LINE Notification...\n")
    test_notify_completion()
    print("\n✅ 測試完成！")
