FROM python:3.12-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libreoffice \
        qpdf \
        ghostscript \
        tesseract-ocr \
        tesseract-ocr-eng \
        tesseract-ocr-tam \
        tesseract-ocr-hin \
        tesseract-ocr-mal \
        tesseract-ocr-tel \
        tesseract-ocr-kan \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .

RUN pip install \
    --no-cache-dir \
    -r requirements.txt

COPY converter_api.py .

ENV CORS_ORIGINS=*

ENV MAX_FILE_BYTES=104857600

ENV OCR_DPI=220

ENV OCR_MIN_TEXT_CHARS=40
EXPOSE 10000
CMD ["sh", "-c", "uvicorn converter_api:app --host 0.0.0.0 --port ${PORT:-10000}"]
