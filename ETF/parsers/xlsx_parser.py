import pathlib
import datetime as dt
import pandas as pd
import re
import logging
from openpyxl import load_workbook
from typing import Optional, Tuple

logger = logging.getLogger(__name__)

def normalize_date(date_str: str) -> Optional[str]:
    """
    Parse date string to YYYYMMDD.
    Supports ROC (115/01/22) and AD (2026/01/22).
    """
    s = str(date_str).strip()
    if not s: return None
    
    # Try YYYY/MM/DD or YYYY-MM-DD
    # Regex for 4 digits year
    m_ad = re.search(r"(\d{4})[/-](\d{1,2})[/-](\d{1,2})", s)
    if m_ad:
        return f"{m_ad.group(1)}{int(m_ad.group(2)):02d}{int(m_ad.group(3)):02d}"
        
    # Try ROC
    m_roc = re.search(r"(\d{2,3})[/-](\d{1,2})[/-](\d{1,2})", s)
    if m_roc:
        try:
            roc_year = int(m_roc.group(1))
            ad_year = roc_year + 1911
            return f"{ad_year}{int(m_roc.group(2)):02d}{int(m_roc.group(3)):02d}"
        except:
            pass
            
    return None

def parse_holdings_xlsx(xlsx_path: pathlib.Path) -> Tuple[pd.DataFrame, Optional[str]]:
    """
    Parse 00981A specific holding XLSX.
    Returns (DataFrame, data_date_str)
    """
    logger.info(f"Parsing XLSX: {xlsx_path}")
    
    # 1. Extract Data Date (Using openpyxl for reliable cell access)
    data_date = None
    try:
        wb = load_workbook(xlsx_path, read_only=True, data_only=True)
        ws = wb.worksheets[0]
        
        # Scan header area for date
        for r in range(1, 10): # Usually top rows
            if data_date: break
            for c in range(1, 6):
                v = ws.cell(row=r, column=c).value
                s_val = str(v) if v else ""
                if "資料日期" in s_val:
                    # Case 1: "資料日期：2026/01/22" in one cell
                    if ":" in s_val or "：" in s_val:
                        parts = re.split(r"[:：]", s_val)
                        if len(parts) > 1:
                            data_date = normalize_date(parts[1])
                    # Case 2: "資料日期" in cell A, Date in cell B
                    if not data_date:
                        next_v = ws.cell(row=r, column=c+1).value
                        if next_v:
                            data_date = normalize_date(str(next_v))
                    
                    if data_date: break
        wb.close()
    except Exception as e:
        logger.error(f"Error extracting date: {e}")
        
    date_formatted = ""
    if data_date:
        date_formatted = f"{data_date[:4]}-{data_date[4:6]}-{data_date[6:]}" # YYYY-MM-DD
    else:
        # Fallback: if filename has date? 
        # But we want date from content.
        logger.warning("Could not find Data Date in Excel content.")
    
    # 2. Extract Holdings
    try:
        # Read without header first to find the real header
        df = pd.read_excel(xlsx_path, header=None, dtype=str)
        
        # Identify header row
        header_idx = -1
        col_map_candidate = {}
        
        for i, row in df.iterrows():
            row_str = " ".join(row.fillna("").astype(str))
            # Look for "股票名稱" AND "股票代號" to be sure
            if "股票名稱" in row_str and "股票代號" in row_str:
                header_idx = i
                break
        
        if header_idx == -1:
            logger.error("Could not find header row with '股票名稱' and '股票代號'")
            return pd.DataFrame(), date_formatted
            
        # Set columns
        df.columns = df.iloc[header_idx]
        df = df.iloc[header_idx+1:].copy() # Data rows
        
        # Standardize columns
        col_map = {}
        for c in df.columns:
            c_str = str(c).strip()
            if "代碼" in c_str or "代號" in c_str:
                col_map[c] = "code"
            elif "名稱" in c_str:
                col_map[c] = "name"
            elif "股數" in c_str:
                col_map[c] = "shares"
            elif "權重" in c_str or "比例" in c_str:
                col_map[c] = "weight"
                
        df = df.rename(columns=col_map)
        
        required = ["code", "name", "shares", "weight"]
        if not all(k in df.columns for k in required):
            logger.error(f"Missing required columns after mapping. Found: {df.columns.tolist()}")
            return pd.DataFrame(), date_formatted
            
        # Clean Data
        df = df.dropna(subset=["code"])
        df = df[df["code"].str.strip() != ""] # Remove empty codes
        
        # Remove non-stock rows (e.g. footer stats)
        # Check if code looks like a stock code (digits or non-empty)
        # Some summary rows might have NaN code
        
        # Types
        df["code"] = df["code"].astype(str).str.strip()
        df["name"] = df["name"].astype(str).str.strip()
        
        def clean_shares(x):
            try:
                return int(float(str(x).replace(",", "")))
            except:
                return 0
                
        df["shares"] = df["shares"].apply(clean_shares)
        
        def clean_weight(x):
            try:
                return float(str(x).replace("%", "").replace(",", ""))
            except:
                return 0.0
                
        df["weight"] = df["weight"].apply(clean_weight)
        
        # Filter out 0 shares (often footer items)
        df = df[df["shares"] > 0]
        
        return df, date_formatted

    except Exception as e:
        logger.error(f"Error parsing holdings: {e}")
        return pd.DataFrame(), date_formatted
