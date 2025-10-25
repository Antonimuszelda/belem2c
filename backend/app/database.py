from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

# Definição do banco de dados SQLite (o mais leve para seu notebook)
SQLALCHEMY_DATABASE_URL = "sqlite:///./sentinel_ia.db"

# 1. Cria a Engine de Conexão (o create_engine que estava faltando import)
# connect_args={"check_same_thread": False} é OBRIGATÓRIO para SQLite no FastAPI
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

# 2. Configura a Sessão de Banco de Dados
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 3. Base Declarativa
Base = declarative_base()

# ----------------------------------------------------
# Função de Dependência (usada nos endpoints do FastAPI)
# ----------------------------------------------------
def get_db():
    """Gera e fecha uma sessão de banco de dados para cada requisição."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()