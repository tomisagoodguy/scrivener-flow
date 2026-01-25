# 使用 Python 3.10
FROM python:3.10-slim

# 建立一個非 root 使用者 (Hugging Face 安全要求)
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

WORKDIR $HOME/app

# 安裝系統依賴 (需要用 root 安裝後再切換回 user)
USER root
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxrender1 \
    libxext6 \
    && rm -rf /var/lib/apt/lists/*
USER user

# 複製並安裝依賴
# 注意：我們直接安裝最核心的包，確保穩定
COPY --chown=user pyproject.toml .
RUN pip install --no-cache-dir paddlepaddle paddleocr opencv-python pymupdf opencc fastapi uvicorn python-multipart

# 複製程式碼
COPY --chown=user . .

# Hugging Face Spaces 必須曝露 7860 埠號
EXPOSE 7860

# 啟動伺服器，將埠號設為 7860
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "7860"]
