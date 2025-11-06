#!/usr/bin/env python3
"""
Script de validação rápida dos arquivos de deploy
Verifica se todos os arquivos necessários existem
"""

import sys
from pathlib import Path

def check_file(path, description):
    """Verifica se um arquivo existe"""
    if path.exists():
        print(f"✅ {description}: {path.name}")
        return True
    else:
        print(f"❌ {description}: {path.name} - NÃO ENCONTRADO")
        return False

def check_content(path, search_term, description):
    """Verifica se um arquivo contém determinado conteúdo"""
    if not path.exists():
        print(f"❌ {description}: arquivo não existe")
        return False
    
    content = path.read_text(encoding='utf-8')
    if search_term in content:
        print(f"✅ {description}")
        return True
    else:
        print(f"⚠️  {description}: termo '{search_term}' não encontrado")
        return False

def main():
    print("=" * 60)
    print("🔍 Validação de Arquivos de Deploy - Sentinel-IA")
    print("=" * 60)
    print()
    
    # Diretório raiz do projeto
    root = Path(__file__).parent
    backend = root / "backend"
    frontend = root / "frontend"
    
    all_ok = True
    
    # ===== BACKEND =====
    print("📦 Backend - Arquivos Essenciais:")
    print("-" * 60)
    
    all_ok &= check_file(backend / "Dockerfile", "Dockerfile")
    all_ok &= check_file(backend / "procfile", "Procfile")
    all_ok &= check_file(backend / "requirements.txt", "Requirements")
    all_ok &= check_file(backend / ".dockerignore", "Docker Ignore")
    all_ok &= check_file(backend / "railway.json", "Railway Config")
    all_ok &= check_file(backend / ".env.example", "Env Example")
    all_ok &= check_file(backend / "app" / "main.py", "Main App")
    
    print()
    print("🔍 Backend - Verificação de Conteúdo:")
    print("-" * 60)
    
    all_ok &= check_content(
        backend / "Dockerfile",
        "app.main:app",
        "Dockerfile usa caminho correto (app.main:app)"
    )
    
    all_ok &= check_content(
        backend / "procfile",
        "app.main:app",
        "Procfile usa caminho correto (app.main:app)"
    )
    
    all_ok &= check_content(
        backend / "app" / "main.py",
        "FRONTEND_URL",
        "Main.py configurado para CORS com Vercel"
    )
    
    all_ok &= check_content(
        backend / "requirements.txt",
        "gunicorn",
        "Requirements inclui Gunicorn"
    )
    
    print()
    
    # ===== FRONTEND =====
    print("🌐 Frontend - Arquivos Essenciais:")
    print("-" * 60)
    
    all_ok &= check_file(frontend / "vercel.json", "Vercel Config")
    all_ok &= check_file(frontend / ".env.example", "Env Example")
    all_ok &= check_file(frontend / ".vercelignore", "Vercel Ignore")
    all_ok &= check_file(frontend / "package.json", "Package.json")
    all_ok &= check_file(frontend / "vite.config.ts", "Vite Config")
    
    print()
    print("🔍 Frontend - Verificação de Conteúdo:")
    print("-" * 60)
    
    all_ok &= check_content(
        frontend / "vercel.json",
        "outputDirectory",
        "Vercel.json configurado corretamente"
    )
    
    all_ok &= check_content(
        frontend / ".env.example",
        "VITE_API_URL",
        ".env.example tem VITE_API_URL"
    )
    
    # Verificar se algum componente usa a variável de ambiente
    control_panel = frontend / "src" / "components" / "ControlPanel.tsx"
    if control_panel.exists():
        all_ok &= check_content(
            control_panel,
            "VITE_API_URL",
            "ControlPanel.tsx usa variável de ambiente"
        )
    
    print()
    
    # ===== DOCUMENTAÇÃO =====
    print("📚 Documentação:")
    print("-" * 60)
    
    all_ok &= check_file(root / "DEPLOY.md", "Guia Completo de Deploy")
    all_ok &= check_file(root / "QUICK_DEPLOY.md", "Guia Rápido de Deploy")
    all_ok &= check_file(root / "CHANGES_SUMMARY.md", "Resumo de Mudanças")
    all_ok &= check_file(root / "TESTING_COMMANDS.md", "Comandos de Teste")
    all_ok &= check_file(root / "README_DEPLOY.md", "README de Deploy")
    
    print()
    print("=" * 60)
    
    if all_ok:
        print("✅ Todos os arquivos de deploy estão configurados!")
        print("🚀 Pronto para deploy no Railway e Vercel!")
        print()
        print("Próximos passos:")
        print("1. Leia QUICK_DEPLOY.md para instruções")
        print("2. Configure variáveis de ambiente")
        print("3. Faça deploy no Railway (backend)")
        print("4. Faça deploy no Vercel (frontend)")
    else:
        print("⚠️  Alguns arquivos estão faltando ou mal configurados")
        print("❌ Verifique os erros acima e corrija antes do deploy")
        sys.exit(1)
    
    print("=" * 60)
    return 0 if all_ok else 1

if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\n\nValidação cancelada pelo usuário")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Erro durante validação: {e}")
        sys.exit(1)
