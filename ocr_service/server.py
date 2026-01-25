from fastapi import FastAPI, UploadFile, File, HTTPException
import os
import shutil
import uuid
import traceback
from paddleocr import PaddleOCR
import json
from main import scan_image  # 重用之前的分析邏輯

app = FastAPI(title="Identity Card OCR Service")

# 1. 啟動時先初始化模型 (極度優化參數)
print("[系統] 正在啟動 OCR 常駐引擎 (分身啟動中)...")
ocr = PaddleOCR(
    use_textline_orientation=True, 
    use_angle_cls=False,         # 關閉角度分類加速
    lang='ch', 
    enable_mkldnn=True, 
    cpu_threads=1,               # 每個分身佔 1 執行緒
    det_limit_side_len=480       # 縮減檢測範圍
)
print("[系統] 引擎已就緒")

@app.post("/identify")
def identify_id_cards(file: UploadFile = File(...)):
    # 使用系統 /tmp 目錄 (Hugging Face 確保可寫)
    temp_dir = "/tmp/temp_uploads"
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
    # 這裡啟動 2 個 Workers，每個 Worker 會有獨立的 ocr 實例
    # 剛好利用 2 個 CPU 核心與豐富的 16GB RAM
    uvicorn.run("server:app", host="0.0.0.0", port=7860, workers=2)
