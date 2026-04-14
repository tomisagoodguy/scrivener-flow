"""Prompt 組裝層：純函式，接受結構化資料，輸出 AI Prompt 字串。"""

import json
from datetime import datetime

import pandas as pd


ETF_NAME_MAP: dict[str, str] = {
    "00981A": "00981 (半導體收益 ETF)",
    "00980A": "00980 (野村智慧優選)",
    "00991A": "00991 (復華未來50)",
}


def build_report_prompt(
    holdings_df: pd.DataFrame,
    stats: dict,
    technical_map: dict[str, dict],
    top_holdings: list[dict],
    etf_code: str = "00981A",
) -> str:
    """組裝 ETF AI 分析報告的 Prompt。

    Args:
        holdings_df: 完整持股 DataFrame（用於計算統計數據）。
        stats: 彙總統計 dict，含 totalHoldings / top10Weight / avgYoY。
        technical_map: 個股技術/籌碼分析結果，key 為股票代碼。
        top_holdings: 前 10 大持股的基本面資料列表。
        etf_code: ETF 代碼，用於動態產生報告標題。

    Returns:
        完整的 Prompt 字串。
    """
    etf_display_name = ETF_NAME_MAP.get(etf_code, etf_code)
    data_date = datetime.now().strftime("%Y-%m-%d")

    # 風險警示：過熱且 MA20 下彎的個股
    risk_stocks = [
        code
        for code, info in technical_map.items()
        if info.get("isOverheated3M") and info.get("ma20Trend") == "Falling"
    ]
    risk_block = ""
    if risk_stocks:
        risk_block = (
            f"\n⚠️ **高風險警示個股**（近3月漲幅>100% 且 MA20 已下彎）：{', '.join(risk_stocks)}\n"
            "請在報告中特別說明這些個股的風險，提醒投資人股價可能已領先基本面太多。\n"
        )

    top_holdings_str = (
        json.dumps(top_holdings, ensure_ascii=False, indent=2)
        if top_holdings
        else "（無資料）"
    )

    return f"""
你是一位頂尖的 ETF 基金經理人與籌碼分析師。請根據以下提供的 {etf_display_name} **全數持股**數據，深度解析該基金的**投資組合配置邏輯**與**經理人選股偏好**。

### 1. 投資組合概況 (Portfolio Overview)
- **資料日期**：{data_date}
- **持股檔數**：{stats['totalHoldings']} 檔
- **前十大持股權重佔比**：{stats['top10Weight']:.2f}% (集中度指標)
- **平均營收年增率 (YoY)**：{stats['avgYoY']:.2f}% (成長動能指標)

### 2. 個股全方位掃描 (Full Holdings Analysis - Partial Sample for AI)
包含部分關鍵成分股的技術面與籌碼面：
{json.dumps(technical_map, ensure_ascii=False, indent=2)}
*(註：Trend=多空趨勢, itBuy=投信買賣超, brokerNetBuy=主力券商買賣超)*
*(新增指標：volatility=年化波動率%, marginRatio=融資使用率%, revenueMomentumRank=營收動能PR值 0~1)*

### 3. 基本面與權重數據 (Fundamental & Weights - Top 10)
{top_holdings_str}
{risk_block}
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
- 在中低權重持股中，找出 **「高營收動能 (revenueMomentumRank > 0.8) + 籌碼集中 (大戶增持) + 技術面多頭」** 的潛力股。
- 若有 **低波動 (volatility < 8%)** 且 **營收穩定成長** 的防禦型個股，也請一併推薦。

#### 4. ⚠️ 風險與雷區 (Risk Alert) - 請嚴格篩選！
- **股價已反應過度 (Overheated)**：
  - 若個股 **「近3個月股價最大漲幅 > 100%」** (isOverheated3M=True)，但 **營收成長趨勢不順** (YoY/MoM 衰退或持平)，且 **月均價線 (MA20Trend) 已轉弱或下彎**。
  - 請點名這些可能「假突破、真出貨」的危險股，提醒投資人股價可能已領先基本面太多 (Price Priced-in)。
- **高槓桿風險**：若個股 **融資使用率過高 (marginRatio > 40%)** 且技術面轉弱，請特別示警籌碼凌亂風險。
- **基本面與籌碼面雙殺**：營收爛、主力賣，且技術面破線的個股。

#### 5. 💡 總結與操作建議
- 給出這檔 ETF 目前的綜合評分 (1-10分)。
- 建議投資人：是該跟隨經理人腳步「買進持有」，還是目前的持股結構有隱憂 (如過多過熱股)，建議「觀望」？

(請直接輸出報告內容，不需開場白，控制在 1500 字以內)
"""
