from fastapi import FastAPI, UploadFile, File, HTTPException
import os
import shutil
import uuid
import traceback
from paddleocr import PaddleOCR
import json
from main import scan_image  # 重用之前的分析邏輯

import tempfile

app = FastAPI(title="Identity Card OCR Service")

# 1. 啟動時先初始化模型 (使用更穩定的參數)
print("[系統] 正在啟動 OCR 常駐引擎...")
ocr = PaddleOCR(
    use_textline_orientation=True,  # 使用新參數處理方向
    # use_angle_cls=True,        # 已棄用且與 use_textline_orientation 互斥
    lang='ch', 
    enable_mkldnn=False,         # 關閉 mkldnn 以避免 Windows 相容性問題
    cpu_threads=4,               # 提高執行緒數以利用效能
    det_limit_side_len=960       # 恢復標準檢測範圍
)
print("[系統] 引擎已就緒")

@app.post("/identify")
def identify_id_cards(file: UploadFile = File(...)):
    # 使用系統暫存目錄 (跨平台相容)
    temp_dir = os.path.join(tempfile.gettempdir(), "ocr_uploads")
    os.makedirs(temp_dir, exist_ok=True)
    
    file_path = os.path.join(temp_dir, f"{uuid.uuid4()}_{file.filename}")
    
    try:
        # 儲存上傳的檔案
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # 2. 執行辨識 (直接使用已加載的模型)
        results = scan_image(file_path, ocr)
        
        if results is None:
             return {"success": True, "data": []}
             
        return {"success": True, "data": results}
        
    except Exception as e:
        print(f"[錯誤] 辨識發生例外:")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # 清理臨時檔案
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except:
                pass

@app.get("/health")
def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    # Windows 下建議 workers=1 避免多行程模型載入衝突，或需確保記憶體充足
    uvicorn.run("server:app", host="0.0.0.0", port=7860, workers=1)
