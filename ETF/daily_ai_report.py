
import os
import sys
import logging
import json
import argparse
from datetime import datetime
import pandas as pd
from sqlalchemy import text
from dotenv import load_dotenv
import google.generativeai as genai

# Setup Path
try:
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    sys.path.append(project_root)
except Exception:
    project_root = os.getcwd()
    sys.path.append(project_root)

# Import internal modules (after sys.path setup)
from ETF.database.sql_storage import SQLStorage
from ETF.notifiers.line_notifier import LineNotifier

# Config
ETF_CODE = "00981A"
MODELS_TO_TRY = [
    'gemini-2.5-flash',
    'gemini-3-flash',
    'gemini-2.5-flash-lite',
    'gemma-3-27b'
]

# Setup Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("DailyAIReport")


def fetch_holdings(engine):
    """Fetch latest holdings for ETF 00981"""
    query = text("""
        WITH LatestDate AS (
            SELECT MAX(data_date) as max_date FROM etf_holdings_snapshot WHERE etf_code = :etf_code
        )
        SELECT h.*, r.revenue_yoy, r.revenue_mom 
        FROM etf_holdings_snapshot h
        LEFT JOIN stock_revenue_monthly r ON h.stock_code = r.stock_code 
            AND r.data_date = (SELECT MAX(data_date) FROM stock_revenue_monthly WHERE stock_code = h.stock_code)
        WHERE h.etf_code = :etf_code 
          AND h.data_date = (SELECT max_date FROM LatestDate)
        ORDER BY h.weight DESC
    """)
    with engine.connect() as conn:
        result = conn.execute(query, {"etf_code": ETF_CODE})
        df = pd.DataFrame(result.fetchall(), columns=result.keys())
    return df

def fetch_technical_data(engine, stock_codes):
    """Fetch recent price data (close, it_buy)"""
    if not stock_codes:
        return pd.DataFrame()
    
    placeholders = ','.join([':code{}'.format(i) for i in range(len(stock_codes))])
    params = {f'code{i}': code for i, code in enumerate(stock_codes)}
    
    query = text(f"""
        SELECT stock_code, data_date, close, it_buy
        FROM stock_prices_daily
        WHERE stock_code IN ({placeholders})
        ORDER BY data_date DESC
        LIMIT 3000
    """)
    
    with engine.connect() as conn:
        result = conn.execute(query, params)
        df = pd.DataFrame(result.fetchall(), columns=result.keys())
    return df

def fetch_broker_data(engine, stock_codes):
    """Fetch broker net volume data (Top 15 aggregated usually, but here we check main table)"""
    # Note: Using stock_broker_transactions table structure
    if not stock_codes:
        return pd.DataFrame()
    
    placeholders = ','.join([':code{}'.format(i) for i in range(len(stock_codes))])
    params = {f'code{i}': code for i, code in enumerate(stock_codes)}

    query = text(f"""
        SELECT stock_code, data_date, net_volume
        FROM stock_broker_transactions
        WHERE stock_code IN ({placeholders})
        ORDER BY data_date DESC
        LIMIT 1000
    """)
    
    with engine.connect() as conn:
        try:
            result = conn.execute(query, params)
            df = pd.DataFrame(result.fetchall(), columns=result.keys())
            return df
        except Exception as e:
            logger.warning(f"Could not fetch broker data: {e}")
            return pd.DataFrame()

def fetch_chip_data(engine, stock_codes):
    """Fetch weekly shareholder data"""
    if not stock_codes:
        return pd.DataFrame()
        
    placeholders = ','.join([':code{}'.format(i) for i in range(len(stock_codes))])
    params = {f'code{i}': code for i, code in enumerate(stock_codes)}
    
    query = text(f"""
        SELECT stock_code, data_date, shareholder_tier, custody_ratio
        FROM stock_shareholder_weekly
        WHERE stock_code IN ({placeholders})
          AND shareholder_tier IN (1, 2, 3, 4, 5, 15)
        ORDER BY data_date DESC
        LIMIT 3000
    """)
    
    with engine.connect() as conn:
        try:
            result = conn.execute(query, params)
            df = pd.DataFrame(result.fetchall(), columns=result.keys())
            return df
        except Exception as e:
            logger.warning(f"Could not fetch chip data: {e}")
            return pd.DataFrame()

def analyze_stock(code, prices_df, broker_df, chips_df):
    """Analyze single stock trend"""
    stock_prices = prices_df[prices_df['stock_code'] == code].sort_values('data_date', ascending=False)
    
    if len(stock_prices) < 20: 
        return None

    # Calculate MA & Trends
    closes = stock_prices['close'].astype(float).tolist()
    last_close = closes[0]
    ma5 = sum(closes[:5]) / 5
    ma10 = sum(closes[:10]) / 10
    ma20 = sum(closes[:20]) / 20
    
    it_buys = stock_prices['it_buy'].fillna(0).astype(float).tolist()
    it_buy5d = sum(it_buys[:5])
    it_buy20d = sum(it_buys[:20])
    
    trend = 'Neutral'
    if last_close > ma5 > ma20: trend = 'Bullish'
    elif last_close < ma5 < ma20: trend = 'Bearish'
    
    # Broker
    stock_broker = broker_df[broker_df['stock_code'] == code] if not broker_df.empty else pd.DataFrame()
    broker_net_buy_20d = stock_broker['net_volume'].fillna(0).sum() if not stock_broker.empty else 0
    
    # Chips (Simplified Trend)
    large_trend = 'Stable'
    retail_trend = 'Stable'
    
    if not chips_df.empty:
        stock_chips = chips_df[chips_df['stock_code'] == code].sort_values('data_date', ascending=False)
        # Assuming merging tiers logic handled roughly or by specific tiers
        # Simple check: Tier 15 (Large)
        large_chips = stock_chips[stock_chips['shareholder_tier'] == 15]
        if len(large_chips) >= 2:
            curr = large_chips.iloc[0]['custody_ratio']
            prev = large_chips.iloc[1]['custody_ratio']
            if curr > prev + 0.5: large_trend = 'Increasing'
            elif curr < prev - 0.5: large_trend = 'Decreasing'

    return {
        'code': code,
        'lastClose': last_close,
        'ma5': round(ma5, 2),
        'ma20': round(ma20, 2),
        'itBuy5d': it_buy5d,
        'brokerNetBuy20d': broker_net_buy_20d,
        'largeShareholderTrend': large_trend,
        'trend': trend
    }

def generate_report(dry_run=False):
    # Load Env
    if os.path.exists('.env.local'):
        load_dotenv('.env.local')
    else:
        load_dotenv()
    
    api_key = os.getenv("GOOGLE_GEMINI_API_KEY")
    if not api_key:
        logger.error("GOOGLE_GEMINI_API_KEY is missing")
        return

    # Initialize DB Storage (Directly)
    try:
        storage = SQLStorage()
    except Exception as e:
        logger.error(f"Failed to initialize SQLStorage: {e}")
        return
    
    # 1. Fetch Data
    logger.info("Fetching holdings...")
    try:
        holdings_df = fetch_holdings(storage.engine)
    except Exception as e:
        logger.error(f"Failed to fetch holdings: {e}")
        return

    if holdings_df.empty:
        logger.error("No holdings found for 00981")
        return
        
    stock_codes = holdings_df['stock_code'].tolist()
    
    logger.info("Fetching technical data...")
    prices_df = fetch_technical_data(storage.engine, stock_codes)
    broker_df = fetch_broker_data(storage.engine, stock_codes)
    chips_df = fetch_chip_data(storage.engine, stock_codes)
    
    # 2. Analyze
    logger.info("Analyzing stocks...")
    technical_map = {}
    for code in stock_codes:
        try:
            analysis = analyze_stock(code, prices_df, broker_df, chips_df)
            if analysis:
                technical_map[code] = analysis
        except Exception:
            continue
            
    # Prepare Top Holdings
    top_holdings = holdings_df.head(10)[['stock_name', 'stock_code', 'weight', 'revenue_yoy', 'revenue_mom']].to_dict('records')
    
    stats = {
        'totalHoldings': len(holdings_df),
        'top10Weight': holdings_df.head(10)['weight'].sum(),
        'avgYoY': holdings_df['revenue_yoy'].mean()
    }
    
    # 3. Construct Prompt
    data_date = datetime.now().strftime("%Y-%m-%d")
    
    system_prompt = f"""
    你是一位頂尖的 ETF 基金經理人與籌碼分析師。請根據以下提供的 00981 (半導體收益 ETF) **全數持股**數據，深度解析該基金的**投資組合配置邏輯**與**經理人選股偏好**。
    
    ### 1. 投資組合概況 (Portfolio Overview)
    - **資料日期**：{data_date}
    - **持股檔數**：{stats['totalHoldings']} 檔
    - **前十大持股權重佔比**：{stats['top10Weight']:.2f}% (集中度指標)
    - **平均營收年增率 (YoY)**：{stats['avgYoY']:.2f}% (成長動能指標)
    
    ### 2. 個股全方位掃描 (Full Holdings Analysis - Partial Sample for AI)
    包含部分關鍵成分股的技術面與籌碼面：
    {json.dumps(technical_map, ensure_ascii=False, indent=2)}
    *(註：Trend=多空趨勢, itBuy=投信買賣超, brokerNetBuy=主力券商買賣超)*
    
    ### 3. 基本面與權重數據 (Fundamental & Weights - Top 10)
    {json.dumps(top_holdings, ensure_ascii=False, indent=2)}
    
    ---
    
    ### 分析報告要求
    請以 **Markdown** 格式輸出，語氣專業且犀利，這是一份要給投資人的「基金體檢報告」，請重點回答以下問題：
    
    #### 1. 🕵️‍♂️ 經理人的選股邏輯 (Manager's Preference)
    - **經理人最愛誰？** 從權重配置 (Weight) 來看，經理人重倉了哪些個股？
    - **持股集中度**：經理人是採取「重押少數菁英股」還是「分散風險」的策略？這對績效有何影響？
    
    #### 2. 🔍 核心持股檢視 (Core Holdings Review)
    - 針對 **權重最高的前幾名 (Top Holdings)** 進行嚴格檢視：
      - 這些重倉股目前的技術面 (Trend) 與籌碼面 (主力/大戶) 是否健康？
      - **有無「經理人看走眼」的重倉股**？(例如權重高但營收衰退、法人在賣、技術面破線的拖油瓶)。
    
    #### 3. 🚀 潛力黑馬挖掘 (Hidden Gems)
    - 在中低權重持股中，找出 **「營收高成長 + 籌碼集中 (大戶增持) + 技術面多頭」** 的潛力股。
    
    #### 4. ⚠️ 風險與雷區 (Risk Alert)
    - 點名哪些持股目前 **基本面與籌碼面雙殺** (營收爛、主力賣)，建議投資人若有持有個股應避開。
    
    #### 5. 💡 總結與操作建議
    - 給出這檔 ETF 目前的綜合評分 (1-10分)。
    - 建議投資人：是該跟隨經理人腳步「買進持有」，還是目前的持股結構有隱憂，建議「觀望」？
    
    (請直接輸出報告內容，不需開場白，控制在 1500 字以內)
    """
    
    # 4. Call Gemini
    genai.configure(api_key=api_key)
    
    logger.info("Calling Gemini...")
    for model_name in MODELS_TO_TRY:
        try:
            logger.info(f"Using model: {model_name}")
            model = genai.GenerativeModel(model_name)
            response = model.generate_content(system_prompt)
            
            if response and response.text:
                logger.info("Generated report successfully.")
                
                if dry_run:
                    logger.info("🐛 Dry Run Mode: Report generated but not sent.")
                    print(f"\n[Dry Run Report Output]\n{response.text[:200]}...\n(Truncated for log)\n")
                    return

                # 5. Notify
                # Prioritize STOCK_ specific bot
                token_env = "STOCK_LINE_CHANNEL_ACCESS_TOKEN" if os.getenv("STOCK_LINE_CHANNEL_ACCESS_TOKEN") else "LINE_CHANNEL_ACCESS_TOKEN"
                user_id_env = "STOCK_LINE_USER_ID" if os.getenv("STOCK_LINE_USER_ID") else "LINE_USER_ID"
                
                notifier = LineNotifier(token_env=token_env, user_id_env=user_id_env)
                notifier.broadcast_ai_report(response.text)
                return
                
        except Exception as e:
            logger.warning(f"Model {model_name} failed: {e}")
            continue
            
    logger.error("All models failed.")

def main():
    parser = argparse.ArgumentParser(description="Generate AI Investment Report")
    parser.add_argument("--dry-run", action="store_true", help="Generate report without sending to LINE")
    args = parser.parse_args()
    
    generate_report(dry_run=args.dry_run)

if __name__ == "__main__":
    main()
