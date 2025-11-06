# --- STAGE 1: Build Stage (Instala dependências do SO) ---
FROM python:3.11-slim as builder

# Define a variável de ambiente para evitar interação com o usuário durante a instalação
ENV DEBIAN_FRONTEND=noninteractive

# Instala as dependências de sistema para GDAL/GEOS (essenciais para Fiona e Shapely)
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    build-essential \
    gdal-bin \
    libgdal-dev \
    libxml2-dev \
    libproj-dev \
    libgeos-dev \
    python3-gdal \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Configura o diretório de trabalho
WORKDIR /app

# Copia o requirements.txt e instala as dependências Python
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# --- STAGE 2: Production Stage (Imagem final mais leve) ---
FROM python:3.11-slim

# Variáveis de ambiente
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PORT=8000

# Instala apenas as bibliotecas runtime necessárias (sem build tools)
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    libgdal30 \
    libgeos-c1v5 \
    libproj25 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copia os pacotes Python instalados da builder stage
COPY --from=builder /usr/local/lib/python3.11/site-packages/ /usr/local/lib/python3.11/site-packages/
COPY --from=builder /usr/local/bin/ /usr/local/bin/

# Copia o código da aplicação
COPY . .

# Cria diretórios necessários
RUN mkdir -p uploads data

# Expõe a porta (Railway usa a variável $PORT)
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:${PORT:-8000}/health').read()" || exit 1

# Comando de inicialização para Railway
CMD exec gunicorn app.main:app \
    --bind 0.0.0.0:${PORT:-8000} \
    --workers 4 \
    --worker-class uvicorn.workers.UvicornWorker \
    --timeout 120 \
    --access-logfile - \
    --error-logfile - \
    --log-level info