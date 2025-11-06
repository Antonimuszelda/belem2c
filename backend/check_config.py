#!/usr/bin/env python3
"""
Script de verificação de configuração para deploy
Verifica se todas as variáveis de ambiente necessárias estão configuradas
"""

import os
import sys
from pathlib import Path
import json

def check_env_var(var_name, required=True):
    """Verifica se uma variável de ambiente está definida"""
    value = os.getenv(var_name)
    if value:
        print(f"✅ {var_name}: Configurada")
        return True
    else:
        if required:
            print(f"❌ {var_name}: NÃO configurada (OBRIGATÓRIA)")
        else:
            print(f"⚠️  {var_name}: NÃO configurada (OPCIONAL)")
        return not required

def validate_json(json_str):
    """Valida se uma string é um JSON válido"""
    try:
        json.loads(json_str)
        return True
    except:
        return False

def main():
    print("=" * 60)
    print("🔍 Verificação de Configuração - Sentinel-IA Backend")
    print("=" * 60)
    print()
    
    # Carrega .env se existir
    env_file = Path(__file__).parent / '.env'
    if env_file.exists():
        print(f"📄 Arquivo .env encontrado: {env_file}")
        from dotenv import load_dotenv
        load_dotenv()
    else:
        print("⚠️  Arquivo .env não encontrado")
        print("   As variáveis devem estar configuradas no Railway")
    
    print()
    print("-" * 60)
    print("Verificando variáveis de ambiente obrigatórias:")
    print("-" * 60)
    
    all_ok = True
    
    # Google Earth Engine
    print("\n🌍 Google Earth Engine:")
    all_ok &= check_env_var("D_DO_PROJETO_GEE")
    
    # Credenciais GEE
    has_json = check_env_var("GOOGLE_APPLICATION_CREDENTIALS_JSON", required=False)
    has_b64 = check_env_var("GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64", required=False)
    
    if not (has_json or has_b64):
        print("❌ Nenhuma credencial GEE configurada!")
        print("   Configure GOOGLE_APPLICATION_CREDENTIALS_JSON ou")
        print("   GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64")
        all_ok = False
    elif has_json:
        json_str = os.getenv("GOOGLE_APPLICATION_CREDENTIALS_JSON")
        if validate_json(json_str):
            print("   ✅ JSON válido")
        else:
            print("   ❌ JSON inválido!")
            all_ok = False
    
    # Google API
    print("\n🤖 Google Generative AI:")
    all_ok &= check_env_var("GOOGLE_API_KEY")
    
    # CORS
    print("\n🌐 CORS:")
    check_env_var("FRONTEND_URL", required=False)
    
    # Porta
    print("\n🔌 Porta:")
    port = os.getenv("PORT", "8000")
    print(f"ℹ️  PORT: {port} (padrão: 8000)")
    
    print()
    print("=" * 60)
    if all_ok:
        print("✅ Todas as configurações obrigatórias estão corretas!")
        print("   O backend está pronto para deploy no Railway")
    else:
        print("❌ Algumas configurações estão faltando!")
        print("   Corrija os erros acima antes de fazer deploy")
        sys.exit(1)
    print("=" * 60)
    
    # Verificação adicional de arquivos
    print("\n📁 Verificando arquivos essenciais:")
    files_to_check = [
        "Dockerfile",
        "requirements.txt",
        "procfile",
        "app/main.py",
    ]
    
    for file_path in files_to_check:
        full_path = Path(__file__).parent / file_path
        if full_path.exists():
            print(f"✅ {file_path}")
        else:
            print(f"❌ {file_path} - NÃO ENCONTRADO")
            all_ok = False
    
    print()
    if all_ok:
        print("🚀 Tudo pronto para deploy!")
    else:
        print("⚠️  Alguns arquivos estão faltando")
    
    return 0 if all_ok else 1

if __name__ == "__main__":
    sys.exit(main())
