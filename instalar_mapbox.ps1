# Script de Instalação do Mapbox para HARP-IA
# Execute este script no PowerShell

Write-Host "🗺️  INSTALANDO MAPBOX GL E MAPBOX DRAW..." -ForegroundColor Cyan
Write-Host ""

# Navegar para o diretório frontend
$frontendPath = Join-Path $PSScriptRoot "frontend"
if (-not (Test-Path $frontendPath)) {
    Write-Host "❌ Erro: Diretório frontend não encontrado!" -ForegroundColor Red
    Write-Host "   Execute este script na raiz do projeto." -ForegroundColor Yellow
    exit 1
}

Set-Location $frontendPath
Write-Host "📂 Diretório: $frontendPath" -ForegroundColor Green
Write-Host ""

# Instalar dependências do Mapbox
Write-Host "📦 Instalando mapbox-gl..." -ForegroundColor Cyan
npm install mapbox-gl@3.1.2

Write-Host "📦 Instalando @mapbox/mapbox-gl-draw..." -ForegroundColor Cyan
npm install @mapbox/mapbox-gl-draw@1.4.3

Write-Host "📦 Instalando types do TypeScript..." -ForegroundColor Cyan
npm install --save-dev @types/mapbox-gl @types/mapbox__mapbox-gl-draw

Write-Host ""
Write-Host "✅ DEPENDÊNCIAS INSTALADAS COM SUCESSO!" -ForegroundColor Green
Write-Host ""

# Verificar instalação
Write-Host "🔍 Verificando instalação..." -ForegroundColor Cyan
npm list mapbox-gl @mapbox/mapbox-gl-draw

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🎉 INSTALAÇÃO CONCLUÍDA!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 PRÓXIMOS PASSOS:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1️⃣  Para TESTAR o Mapbox (recomendado):" -ForegroundColor White
Write-Host "   cd src" -ForegroundColor Gray
Write-Host "   Rename-Item -Path 'App.tsx' -NewName 'App_Leaflet_BACKUP.tsx'" -ForegroundColor Gray
Write-Host "   Rename-Item -Path 'App_Mapbox.tsx' -NewName 'App.tsx'" -ForegroundColor Gray
Write-Host ""
Write-Host "2️⃣  Iniciar o servidor de desenvolvimento:" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "3️⃣  Para VOLTAR ao Leaflet (se necessário):" -ForegroundColor White
Write-Host "   cd src" -ForegroundColor Gray
Write-Host "   Remove-Item 'App.tsx'" -ForegroundColor Gray
Write-Host "   Rename-Item -Path 'App_Leaflet_BACKUP.tsx' -NewName 'App.tsx'" -ForegroundColor Gray
Write-Host ""
Write-Host "📖 Leia INSTRUCOES_MAPBOX.md para mais detalhes!" -ForegroundColor Cyan
Write-Host ""

# Perguntar se quer ativar o Mapbox automaticamente
Write-Host "❓ Deseja ATIVAR o Mapbox agora? (S/N): " -ForegroundColor Yellow -NoNewline
$resposta = Read-Host

if ($resposta -eq 'S' -or $resposta -eq 's') {
    Write-Host ""
    Write-Host "🔄 Ativando Mapbox..." -ForegroundColor Cyan
    
    $srcPath = Join-Path $frontendPath "src"
    Set-Location $srcPath
    
    # Backup do App.tsx atual
    if (Test-Path "App.tsx") {
        Write-Host "📦 Fazendo backup de App.tsx → App_Leaflet_BACKUP.tsx" -ForegroundColor Yellow
        Rename-Item -Path "App.tsx" -NewName "App_Leaflet_BACKUP.tsx" -Force
    }
    
    # Ativar App_Mapbox.tsx
    if (Test-Path "App_Mapbox.tsx") {
        Write-Host "✅ Ativando App_Mapbox.tsx → App.tsx" -ForegroundColor Green
        Rename-Item -Path "App_Mapbox.tsx" -NewName "App.tsx" -Force
    } else {
        Write-Host "❌ Erro: App_Mapbox.tsx não encontrado!" -ForegroundColor Red
        Write-Host "   Verifique se o arquivo foi criado corretamente." -ForegroundColor Yellow
        exit 1
    }
    
    Write-Host ""
    Write-Host "✨ MAPBOX ATIVADO COM SUCESSO!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🚀 Execute 'npm run dev' para testar!" -ForegroundColor Cyan
    Write-Host ""
    
} else {
    Write-Host ""
    Write-Host "👍 OK! O Leaflet continua ativo." -ForegroundColor Green
    Write-Host "   Você pode ativar o Mapbox manualmente depois." -ForegroundColor Gray
    Write-Host ""
}

Set-Location $PSScriptRoot
