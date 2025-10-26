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
    python3-gdal \
    # Limpa o cache para reduzir o tamanho da imagem
    && rm -rf /var/lib/apt/lists/*

# Configura o diretório de trabalho
WORKDIR /app

# Copia o requirements.txt e instala as dependências Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# --- STAGE 2: Production Stage (Imagem final mais leve) ---
FROM python:3.11-slim

WORKDIR /app

# Copia as bibliotecas geoespaciais e binários GDAL/GEOS da builder stage
COPY --from=builder /usr/lib/ /usr/lib/
COPY --from=builder /usr/local/lib/python3.11/site-packages/ /usr/local/lib/python3.11/site-packages/
COPY --from=builder /usr/local/bin/ /usr/local/bin/

# Copia o código da aplicação
COPY . .

# Comando de inicialização CRÍTICO para Railway/Docker
# O Gunicorn usa a variável de ambiente $PORT fornecida pelo Railway
# Ele é mais robusto que o Uvicorn direto.
# O Gunicorn precisa do caminho completo do módulo Python: 'nome_da_pasta.nome_do_arquivo:nome_da_app'
# Se main.py estiver dentro de uma pasta 'app', use 'app.main:app'
CMD exec gunicorn app.main:app --bind 0.0.0.0:$PORT --workers 4 --worker-class uvicorn.workers.UvicornWorker --timeout 120