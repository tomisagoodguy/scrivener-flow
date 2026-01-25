import cv2
import sys
import os
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
            print(f"[PDF] 檔案共有 {len(doc)} 頁")
            
            for page_num, page in enumerate(doc):
                print(f"[PDF] 正在掃描第 {page_num + 1} 頁 ...")
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
                
        except ImportError:
            print("[錯誤] 尚未安裝 pymupdf")
            return None
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

    # 遍歷每一頁的結果
    for i, page_data in enumerate(result):
        if not page_data: continue
        
        # 新版 PaddleOCR 字典結構
        if isinstance(page_data, dict):
            texts = page_data.get('rec_texts', [])
            scores = page_data.get('rec_scores', [])
            boxes = page_data.get('det_polygons', []) # 嘗試取得座標
            
            # Fallback for boxes
            if len(boxes) != len(texts):
                boxes = [None] * len(texts)

            for idx, (text, score, box) in enumerate(zip(texts, scores, boxes)):
                if score > 0.5: # Lowered threshold
                     # 簡轉繁
                     if cc: text = cc.convert(text)
                     
                     full_results_list.append({
                         "text": text,
                         "score": score,
                         "box": box,
                         "page": page_index or 1
                     })
                     
        elif isinstance(page_data, list):
            # 標準結構 List of [box, (text, score)]
            for idx, line in enumerate(page_data):
                try:
                    if len(line) >= 2 and isinstance(line[1], (list, tuple)):
                        box = line[0]
                        text = line[1][0]
                        confidence = line[1][1]
                        
                        if confidence > 0.5: # Lowered threshold
                            # 簡轉繁
                            if cc: text = cc.convert(text)
                            
                            full_results_list.append({
                                "text": text,
                                "score": confidence,
                                "box": box,
                                "page": page_index or 1
                            })
                except Exception as e:
                    continue
        else:
             pass

def analyze_file_data(file_path, full_results):
    # 此函式原本是 analyze_and_save，現在改為只負責分析並回傳資料結構
    # 不再直接寫檔，改由 main 統一收集後寫入或個別寫入
    
    # ... (原有分析邏輯保留，變數名稱微調) ...
    # 為了節省 tokens 與修改幅度，我們保留原有的 analyze_and_save 邏輯，
    # 但將其重構為 return data dict，而不是 print to console only.
    
    # 這裡直接複製原有核心邏輯，稍作去蕪存菁
    
    # ... (中間邏輯省略，直接重寫一個乾淨的版本) ...
    
    found_names = []
    found_dobs = []
    found_id_numbers = []
    possible_addresses = []
    
    # 暫存邏輯 (複製自之前的 analyze_and_save)
    num_texts = len(full_results)
    skip_indices = set()
    
    for i in range(num_texts):
        if i in skip_indices: continue
        item = full_results[i]
        text = item['text']
        score = item.get('score', 0.0)
        
        if "姓名" in text:
            clean_name = text.replace("姓名", "").strip()
            name_score = score
            
            if not clean_name and i + 1 < num_texts:
                 next_item = full_results[i+1]
                 clean_name = next_item['text']
                 name_score = (score + next_item.get('score', 0)) / 2
                 skip_indices.add(i+1)
            elif i + 1 < num_texts:
                 next_item = full_results[i+1]
                 if len(next_item['text']) <= 3 and not any(k in next_item['text'] for k in ["出生", "性別", "身分"]):
                     clean_name += next_item['text']
                     name_score = (score + next_item.get('score', 0)) / 2
                     skip_indices.add(i+1)
            found_names.append({"text": clean_name.replace(" ", ""), "index": i, "score": name_score})
            
        if "民國" in text and ("年" in text or "月" in text):
            if "發證" not in text and "初發" not in text:
                clean_dob = text.replace("出生", "").replace("年月日", "").strip()
                found_dobs.append({"text": clean_dob, "index": i, "score": score})
                
        if len(text) >= 10:
            clean_text_id = text.replace(" ", "").upper()
            if len(clean_text_id) == 10 and clean_text_id[0].isalpha() and clean_text_id[1:].isdigit():
                found_id_numbers.append({"text": clean_text_id, "index": i, "score": score})
            
        if "住址" in text:
            clean_addr = text.replace("住址", "").strip()
            addr_scores = [score]
            
            curr_idx = i + 1
            while curr_idx < num_texts:
                next_item = full_results[curr_idx]
                next_text = next_item['text']
                next_text_clean = next_text.replace(" ", "").upper()
                
                # Stop conditions
                if any(k in next_text for k in ["姓名", "出生", "性別", "統一編號", "父母", "配偶", "役別"]): break
                if len(next_text_clean) == 10 and next_text_clean[0].isalpha() and next_text_clean[1:].isdigit(): break
                if next_text_clean.isdigit() and len(next_text_clean) > 6: break
                
                address_keywords = ["縣", "市", "區", "鄉", "鎮", "村", "里", "裏", "鄰", "路", "街", "段", "巷", "弄", "號", "樓", "室", "之", "F", "f", "B1"]
                if not any(k in next_text for k in address_keywords): break
                
                clean_addr += next_text
                addr_scores.append(next_item.get('score', 0))
                skip_indices.add(curr_idx)
                curr_idx += 1
            
            avg_addr_score = sum(addr_scores) / len(addr_scores) if addr_scores else 0
            possible_addresses.append({"text": clean_addr, "index": i, "score": avg_addr_score})

    # 組合
    extracted_people = []
    
    # 策略: 以 ID 為主
    used_addresses = set()
    
    for id_info in found_id_numbers:
        person = {
            "id_number": id_info['text'], 
            "name": None, 
            "dob": None, 
            "address": None,
            "confidence": 0.0
        }
        id_idx = id_info['index']
        
        scores = [id_info.get('score', 0)]
        
        # 配對姓名
        min_dist = float('inf')
        for name_info in found_names:
            dist = id_idx - name_info['index']
            if 0 < dist < min_dist:
                min_dist = dist
                person['name'] = name_info['text']
                scores.append(name_info.get('score', 0))
        
        # 配對生日
        min_dist = float('inf')
        for dob_info in found_dobs:
            dist = id_idx - dob_info['index']
            if 0 < dist < min_dist:
                min_dist = dist
                person['dob'] = dob_info['text']
                scores.append(dob_info.get('score', 0))
        
        # 配對住址 (只取最近的)
        min_dist_abs = float('inf')
        best_addr_idx = -1
        
        for idx, addr_info in enumerate(possible_addresses):
            dist = abs(id_idx - addr_info['index'])
            if dist < min_dist_abs:
                min_dist_abs = dist
                person['address'] = addr_info['text']
                best_addr_score = addr_info.get('score', 0)
                best_addr_idx = idx
        
        if best_addr_idx != -1:
            used_addresses.add(best_addr_idx)
            scores.append(possible_addresses[best_addr_idx].get('score', 0))
            
        # 計算平均信心度
        person['confidence'] = round(sum(scores) / len(scores), 2)
            
        extracted_people.append(person)

    # 補漏: 只有住址的 (反面)
    for idx, addr_info in enumerate(possible_addresses):
        if idx not in used_addresses:
            extracted_people.append({
                "name": None, "dob": None, "id_number": None, 
                "address": addr_info['text'],
                "confidence": round(addr_info.get('score', 0), 2)
            })

    return extracted_people

def main():
    if len(sys.argv) < 2:
        print("請提供至少一個圖片或 PDF 路徑作為參數")
        return

    try:
        # 1. 初始化模型 (只做一次!) - 這是加速的關鍵
        print("[系統] 正在初始化 OCR 模型 (請稍候)...")
        # 修正: 移除不被支援的 show_log 參數
        ocr = PaddleOCR(use_textline_orientation=True, lang='ch', enable_mkldnn=False)
        print("[系統] 模型初始化完成")

        # 2. 遍歷所有檔案並處理
        input_files = sys.argv[1:]
        import json
        
        for file_path in input_files:
            if not os.path.exists(file_path): 
                continue
                
            print(f"\n>> 開始處理: {os.path.basename(file_path)}")
            base_name = os.path.basename(file_path)
            json_filename = f"ocr_result_{base_name}.json"
            
            try:
                # 呼叫 scan_image (傳入 ocr 實例)
                parsed_people = scan_image(file_path, ocr)
                
                # 如果 scan_image 回傳 None (失敗)，給空陣列
                if parsed_people is None:
                    parsed_people = []
                
                output_data = {
                    "file": file_path,
                    "parsed_data": parsed_people
                }
                
                with open(json_filename, 'w', encoding='utf-8') as f:
                    json.dump(output_data, f, ensure_ascii=False, indent=2)
                print(f"[系統] 儲存結果: {json_filename}")
                
            except Exception as e:
                print(f"[錯誤] 處理檔案 {file_path} 時發生例外: {e}")
                # 發生錯誤也要寫一個空的 JSON，避免 API 讀不到檔而報錯
                with open(json_filename, 'w', encoding='utf-8') as f:
                    json.dump({"file": file_path, "parsed_data": [], "error": str(e)}, f)
                    
    except Exception as ie:
        print(f"[系統] 致命錯誤: {ie}")

if __name__ == "__main__":
    main()
