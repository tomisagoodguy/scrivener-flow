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

                print(f"[Debug] Page {page_num+1} Image Shape: {img.shape}")
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
    print(f"[Debug] Found {len(all_recognized_texts)} text blocks in {os.path.basename(file_path)}")
    if len(all_recognized_texts) > 0:
        print(f"[Debug] First 5 blocks: {[t['text'] for t in all_recognized_texts[:5]]}")
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
        
        # 🟢 CASE 1: Standard PaddleOCR format (List of Lists)
        if isinstance(page_data, list):
            for idx, line in enumerate(page_data):
                try:
                    if len(line) >= 2 and isinstance(line[1], (list, tuple)):
                        box = line[0]
                        text = line[1][0]
                        confidence = line[1][1]
                        
                        _append_text_result(full_results_list, text, confidence, box, page_index, cc)
                except: continue

        # 🟢 CASE 2: New PaddleX/OCRResult format (Dict-like object)
        # Check for dict-like behavior and specific keys
        elif hasattr(page_data, 'keys') or isinstance(page_data, dict):
            try:
                # Convert to dict if it's a custom object but subscriptable
                data_dict = page_data
                if not isinstance(page_data, dict) and hasattr(page_data, '__dict__'):
                   data_dict = page_data.__dict__
                
                # Try to find keys for boxes, text, scores
                boxes = None
                texts = None
                scores = None

                # Common key variations
                keys = data_dict.keys() if hasattr(data_dict, 'keys') else []
                
                if 'rec_boxes' in str(keys) or 'dt_boxes' in str(keys):
                     boxes = data_dict.get('rec_boxes') if 'rec_boxes' in keys else data_dict.get('dt_boxes')
                
                if 'rec_text' in str(keys) or 'rec_texts' in str(keys):
                     texts = data_dict.get('rec_text') if 'rec_text' in keys else data_dict.get('rec_texts')

                if 'rec_score' in str(keys) or 'rec_scores' in str(keys):
                     scores = data_dict.get('rec_score') if 'rec_score' in keys else data_dict.get('rec_scores')

                if boxes is not None and texts is not None:
                    count = len(boxes)
                    for k in range(count):
                        box = boxes[k]
                        text = texts[k]
                        score = scores[k] if scores is not None and k < len(scores) else 0.99
                        _append_text_result(full_results_list, text, score, box, page_index, cc)
            except Exception as e:
                print(f"[Warning] Failed to parse OCRResult object: {e}")
                continue

def _append_text_result(full_results_list, text, confidence, box, page_index, cc):
    if confidence > 0.4: 
        if cc: text = cc.convert(text)
        text = text.replace(" ", "").replace("|", "").replace("!", "")
        full_results_list.append({
            "text": text,
            "score": confidence,
            "box": box,
            "page": page_index or 1
        })

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
            # 排除發證日期相關關鍵字
            if not any(k in text for k in ["發證", "初發", "補發", "換發"]):
                raw_dob = text.replace("出生", "").replace("日期", "")
                formatted_dob = format_minguo_date(raw_dob)
                found_dobs.append({"text": formatted_dob, "score": score})
                
        # 3. 識別身分證號
        id_match = re.search(r'[A-Z][12]\d{8}', text.upper())
        if id_match:
            found_id_numbers.append({"text": id_match.group(0), "score": score})
            
        # 4. 識別住址 (支援多行目前針對 身分證 背面)
        # 邏輯: 第一行通常到 <鄰> 或 <段>，第二行到 <號> 或 <樓>
        if "住址" in text:
            addr_text = clean_address(text)
            
            # 檢查是否需要換行合併
            # 如果這行以 "鄰" 結尾，或者包含 "縣/市" 但沒結束
            needs_merge = False
            if "鄰" in addr_text and not any(k in addr_text for k in ["號", "樓", "F", "f"]):
                needs_merge = True
            
            curr_idx = i + 1
            if needs_merge and curr_idx < num_texts:
                 next_item = full_results[curr_idx]
                 next_text = next_item['text'].replace(" ", "")
                 # 簡單防呆: 下一行不能是其他欄位
                 if not any(k in next_text for k in ["姓名", "出生", "編號", "配偶", "父母"]):
                     addr_text += next_text
                     skip_indices.add(curr_idx)

            # 最終檢查: 住址必須以 <號> 或 <樓> 或 <室> 結尾才算完整
            # 根據規則：住址最後一個字一定是 <號> 或 <樓> (或 F/室)
            valid_endings = ["號", "樓", "室", "F", "f"]
            if any(end_key in addr_text for end_key in valid_endings):
                 # 去除可能的雜訊 (例如郵遞區號 3+2 碼在前面)
                 match_start = re.search(r'(.{0,3}[縣市].+)', addr_text)
                 if match_start:
                     addr_text = match_start.group(1)
                 
                 # 強制截斷於最後一個有效結尾字元
                 last_idx = -1
                 for k in valid_endings:
                     idx = addr_text.rfind(k)
                     if idx > last_idx:
                         last_idx = idx
                         
                 if last_idx != -1:
                     addr_text = addr_text[:last_idx+1]

                 possible_addresses.append({"text": addr_text, "score": score})

    # 組合資料
    results = []
    
    # 只要有抓到任何資訊就組合
    main_name = found_names[0]['text'] if found_names else None
    main_dob = found_dobs[0]['text'] if found_dobs else None
    main_id = found_id_numbers[0]['text'] if found_id_numbers else None
    # 取最長的地址當作最佳解
    main_addr = sorted(possible_addresses, key=lambda x: len(x['text']), reverse=True)[0]['text'] if possible_addresses else None
    
    if main_name or main_dob or main_id or main_addr:
        results.append({
            "name": main_name,
            "dob": main_dob,
            "id_number": main_id,
            "address": main_addr,
            "confidence": 0.85 
        })

    return results

def main():
    if len(sys.argv) < 2:
        return

    try:
        # 這裡的啟動參數會被 server.py 覆蓋，但保留 CLI 模式的加速
        # 注意: use_angle_cls 與 use_textline_orientation 互斥
        ocr = PaddleOCR(
            use_textline_orientation=True, 
            lang='ch', 
            enable_mkldnn=False, 
            det_limit_side_len=960
        )

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
