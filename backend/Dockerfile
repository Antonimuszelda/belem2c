# 1. ESCOLHE A IMAGEM BASE: Versão Python otimizada
FROM python:3.11-slim

# 2. INSTALA DEPENDÊNCIAS DO SISTEMA (CRÍTICO para Fiona/Shapely)
# 'apt-get' é o gerenciador de pacotes do sistema Linux.
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    gdal-bin \
    libgdal-dev \
    gcc && \
    rm -rf /var/lib/apt/lists/*

# 3. DEFINE O DIRETÓRIO DE TRABALHO
WORKDIR /app

# 4. COPIA E INSTALA DEPENDÊNCIAS PYTHON
# Copia o requirements.txt (já que ele é leve)
COPY requirements.txt .
# Instala as libs Python. Com o GDAL instalado acima, Fiona/Shapely funcionam.
RUN pip install --no-cache-dir -r requirements.txt

# 5. COPIA O CÓDIGO DA APLICAÇÃO E ARQUIVOS
# Copia todo o restante do conteúdo da pasta 'backend' para o container.
COPY . .

# 6. COMANDO DE INICIALIZAÇÃO
# Define o comando que o Railway deve rodar para iniciar o FastAPI.
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT}