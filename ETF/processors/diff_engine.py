import pandas as pd
from typing import List, Dict, Any, Tuple

def compute_diff(prev_df: pd.DataFrame, curr_df: pd.DataFrame, etf_code: str, data_date: str) -> List[Dict[str, Any]]:
    """
    Compare previous snapshot with current data to generate diff logs.
    prev_df columns: code, name, shares, weight
    curr_df columns: code, name, shares, weight
    """
    logs = []
    
    # Pre-process
    # Map code -> record
    prev_map = prev_df.set_index('code').to_dict('index') if not prev_df.empty else {}
    curr_map = curr_df.set_index('code').to_dict('index')
    
    all_codes = set(prev_map.keys()) | set(curr_map.keys())
    
    for code in all_codes:
        p_dat = prev_map.get(code)
        c_dat = curr_map.get(code)
        
        # 1. NEW ENTRY (IN)
        if not p_dat and c_dat:
            logs.append({
                "etf_code": etf_code,
                "data_date": data_date,
                "change_type": "IN",
                "stock_code": code,
                "stock_name": c_dat['name'],
                "diff_shares": c_dat['shares'],
                "diff_weight": c_dat['weight'],
                "description": f"New Entry: {c_dat['name']} ({code})"
            })
            continue
            
        # 2. REMOVED (OUT)
        if p_dat and not c_dat:
            logs.append({
                "etf_code": etf_code,
                "data_date": data_date,
                "change_type": "OUT",
                "stock_code": code,
                "stock_name": p_dat['name'],
                "diff_shares": -p_dat['shares'],
                "diff_weight": -p_dat['weight'],
                "description": f"Removed: {p_dat['name']} ({code})"
            })
            continue
            
        # 3. CHANGED (BUY/SELL)
        if p_dat and c_dat:
            diff_shares = c_dat['shares'] - p_dat['shares']
            diff_weight = c_dat['weight'] - p_dat['weight']
            
            # Thresholds? Maybe minimal changes don't matter.
            # But "shares" change implies trading.
            if diff_shares != 0:
                change_type = "BUY" if diff_shares > 0 else "SELL"
                desc = f"{change_type}: {c_dat['name']} {diff_shares:+} shares"
                
                # Update: only log significant weight changers? 
                # Or just log everything if shares changed.
                # Let's log if shares changed.
                
                logs.append({
                    "etf_code": etf_code,
                    "data_date": data_date,
                    "change_type": change_type,
                    "stock_code": code,
                    "stock_name": c_dat['name'],
                    "diff_shares": diff_shares,
                    "diff_weight": diff_weight,
                    "description": desc
                })
    
    return logs
