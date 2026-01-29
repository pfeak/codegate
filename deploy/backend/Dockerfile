FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

COPY backend/ /app/

RUN pip install --no-cache-dir .

EXPOSE 8000

CMD ["uvicorn", "codegate.main:app", "--host", "0.0.0.0", "--port", "8000"]
