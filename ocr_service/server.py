from fastapi import FastAPI, UploadFile, File, HTTPException
import os
import shutil
import uuid
import traceback
from paddleocr import PaddleOCR
import json
from main import scan_image  # 重用之前的分析邏輯

app = FastAPI(title="Identity Card OCR Service")

# 1. 啟動時先初始化模型
print("[系統] 正在啟動 OCR 常駐引擎 (已優化 MKLDNN 加速)...")
ocr = PaddleOCR(use_textline_orientation=True, lang='ch', enable_mkldnn=True)
print("[系統] 引擎已就緒")

@app.post("/identify")
async def identify_id_cards(file: UploadFile = File(...)):
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
    # 這裡埠號要對應 Dockerfile 和 Hugging Face 要求
    uvicorn.run(app, host="0.0.0.0", port=7860)
