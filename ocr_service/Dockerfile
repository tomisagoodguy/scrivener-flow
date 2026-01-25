# 使用輕量級 Python 映像檔
FROM python:3.10-slim

# 安裝系統層級的依賴 (OpenCV 與 Paddle 需要)
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxrender1 \
    libxext6 \
    && rm -rf /var/lib/apt/lists/*

# 設定工作目錄
WORKDIR /app

# 複製依賴檔並安裝
COPY pyproject.toml .
RUN pip install --no-cache-dir . fastapi uvicorn python-multipart

# 複製程式碼
COPY . .

# 曝露埠號
EXPOSE 8080

# 啟動伺服器 (使用常駐模式)
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8080"]
