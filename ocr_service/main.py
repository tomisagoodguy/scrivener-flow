import cv2
import sys
import os
import re
from paddleocr import PaddleOCR

# 設置 logger 級別以減少警告輸出
import logging
logging.getLogger("ppocr").setLevel(logging.ERROR)

def scan_image(file_path: str, ocr_instance):
    """
    使用已初始化的 PaddleOCR 實例掃描圖片或 PDF
    """
    if not os.path.exists(file_path):
        print(f"[錯誤] 找不到檔案 '{file_path}'")
        return None

    print(f"[處理] 正在處理檔案: {file_path} ...")
    
    # Check file extension
    ext = os.path.splitext(file_path)[1].lower()
    is_pdf = ext == '.pdf'
    
    # 準備此檔案的所有識別文字
    all_recognized_texts = []
    
    if is_pdf:
        try:
            import fitz  # PyMuPDF
            doc = fitz.open(file_path)
            
            for page_num, page in enumerate(doc):
                mat = fitz.Matrix(2, 2) 
                pix = page.get_pixmap(matrix=mat)
                
                import numpy as np
                img_data = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.h, pix.w, pix.n)
                
                if pix.n == 3: # RGB
                    img = cv2.cvtColor(img_data, cv2.COLOR_RGB2BGR)
                elif pix.n == 4: # RGBA
                    img = cv2.cvtColor(img_data, cv2.COLOR_RGBA2BGR)
                else: # Grayscale
                    img = img_data

                result = ocr_instance.ocr(img)
                process_ocr_result(result, all_recognized_texts, page_index=page_num+1)
                
        except Exception as e:
            print(f"[錯誤] PDF 處理失敗: {e}")
            return None
    else:
        # Standard image file
        try:
            result = ocr_instance.ocr(file_path)
            process_ocr_result(result, all_recognized_texts)
        except Exception as e:
            print(f"[錯誤] 識別發生錯誤: {e}")
            return None

    # Analyze specifically for this file
    return analyze_file_data(file_path, all_recognized_texts)

def process_ocr_result(result, full_results_list, page_index=None):
    if not result:
        return
        
    # 初始化簡繁轉換
    try:
        import opencc
        cc = opencc.OpenCC('s2t')
    except ImportError:
        cc = None

    for i, page_data in enumerate(result):
        if not page_data: continue
        
        if isinstance(page_data, list):
            for idx, line in enumerate(page_data):
                try:
                    if len(line) >= 2 and isinstance(line[1], (list, tuple)):
                        box = line[0]
                        text = line[1][0]
                        confidence = line[1][1]
                        
                        if confidence > 0.4: # 稍微調低門檻以備結構化修正
                            if cc: text = cc.convert(text)
                            
                            # 初步清洗文字
                            text = text.replace(" ", "").replace("|", "").replace("!", "")
                            
                            full_results_list.append({
                                "text": text,
                                "score": confidence,
                                "box": box,
                                "page": page_index or 1
                            })
                except: continue

def format_minguo_date(text):
    """
    智慧修正民國日期格式
    """
    # 嘗試提取數字
    digits = re.findall(r'\d+', text)
    if len(digits) >= 3:
        year = digits[0]
        month = digits[1]
        day = digits[2]
        return f"民國 {year} 年 {month} 月 {day} 日"
    
    # 如果只有年份或格式不全，嘗試正規表達式
    match = re.search(r'(\d+)[年.\-/](\d+)[月.\-/](\d+)', text)
    if match:
        return f"民國 {match.group(1)} 年 {match.group(2)} 月 {match.group(3)} 日"
        
    return text

def clean_address(text):
    """
    清理地址中的 OCR 雜訊
    """
    # 移除地址常見的 OCR 錯誤字
    text = text.replace("住址", "").replace(";", "").replace(":", "").strip()
    return text

def analyze_file_data(file_path, full_results):
    found_names = []
    found_dobs = []
    found_id_numbers = []
    possible_addresses = []
    
    num_texts = len(full_results)
    skip_indices = set()
    
    for i in range(num_texts):
        if i in skip_indices: continue
        item = full_results[i]
        text = item['text']
        score = item.get('score', 0.0)
        
        # 1. 識別姓名
        if "姓名" in text:
            name_text = text.replace("姓名", "").strip()
            # 如果姓名標籤後沒字，看下一行
            if not name_text and i + 1 < num_texts:
                next_item = full_results[i+1]
                name_text = next_item['text']
                skip_indices.add(i+1)
            
            # 過濾掉可能的身分證標號或是其他標籤
            if name_text and len(name_text) <= 4 and not any(k in name_text for k in ["出生", "性別", "統一"]):
                found_names.append({"text": name_text, "score": score})
            
        # 2. 識別生日 (民國格式)
        if ("民國" in text and "年" in text) or re.search(r'\d{2,3}年\d{1,2}月', text):
            if "發證" not in text and "初發" not in text:
                formatted_dob = format_minguo_date(text.replace("出生", "").replace("日期", ""))
                found_dobs.append({"text": formatted_dob, "score": score})
                
        # 3. 識別身分證號
        id_match = re.search(r'[A-Z][12]\d{8}', text.upper())
        if id_match:
            found_id_numbers.append({"text": id_match.group(0), "score": score})
            
        # 4. 識別住址
        if "住址" in text:
            addr_text = clean_address(text)
            # 如果地址行沒結束，繼續往後抓直到遇到其他欄位
            curr_idx = i + 1
            while curr_idx < num_texts:
                next_item = full_results[curr_idx]
                next_text = next_item['text']
                if any(k in next_text for k in ["姓名", "出生", "編號", "配偶", "父母"]): break
                if re.search(r'[A-Z][12]\d{8}', next_text.upper()): break
                
                addr_text += next_text
                skip_indices.add(curr_idx)
                curr_idx += 1
            possible_addresses.append({"text": addr_text, "score": score})

    # 組合資料
    results = []
    
    # 只要有抓到任何資訊就組合
    main_name = found_names[0]['text'] if found_names else None
    main_dob = found_dobs[0]['text'] if found_dobs else None
    main_id = found_id_numbers[0]['text'] if found_id_numbers else None
    main_addr = possible_addresses[0]['text'] if possible_addresses else None
    
    if main_name or main_dob or main_id or main_addr:
        results.append({
            "name": main_name,
            "dob": main_dob,
            "id_number": main_id,
            "address": main_addr,
            "confidence": 0.85 # 基本信心度
        })

    return results

def main():
    if len(sys.argv) < 2:
        return

    try:
        # 這裡的啟動參數會被 server.py 覆蓋，但保留 CLI 模式的加速
        ocr = PaddleOCR(use_textline_orientation=True, lang='ch', enable_mkldnn=True, use_angle_cls=False)

        for file_path in sys.argv[1:]:
            if not os.path.exists(file_path): continue
            parsed_data = scan_image(file_path, ocr)
            
            # 輸出 JSON
            import json
            output = {"file": file_path, "parsed_data": parsed_data}
            base_name = os.path.basename(file_path)
            with open(f"ocr_result_{base_name}.json", 'w', encoding='utf-8') as f:
                json.dump(output, f, ensure_ascii=False, indent=2)
                    
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
