FROM python:3.12-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends libreoffice qpdf ghostscript \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY converter_api.py .

ENV CORS_ORIGINS=*
EXPOSE 8000
CMD ["uvicorn", "converter_api:app", "--host", "0.0.0.0", "--port", "8000"]
