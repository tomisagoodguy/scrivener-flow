import re
from typing import Optional

def normalize_date(date_str: str) -> Optional[str]:
    """
    Parse date string to YYYYMMDD.
    Supports ROC (115/01/22) and AD (2026/01/22).
    """
    s = str(date_str).strip()
    if not s:
        return None
    
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
        except ValueError:
            pass
            
    return None
