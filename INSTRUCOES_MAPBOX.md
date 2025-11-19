# 🗺️ Instruções para Instalar e Testar o Mapbox

## 📦 1. Instalar Dependências do Mapbox

Abra o PowerShell no diretório `frontend` e execute:

```powershell
cd frontend
npm install mapbox-gl@3.1.2 @mapbox/mapbox-gl-draw@1.4.3
npm install --save-dev @types/mapbox-gl @types/mapbox__mapbox-gl-draw
```

## 🔧 2. Configurar o Projeto

### Opção A: Testar a Versão Mapbox (Recomendado para testar)

Renomeie os arquivos para testar:

```powershell
# Backup do App.tsx original
cd frontend/src
Rename-Item -Path "App.tsx" -NewName "App_Leaflet_BACKUP.tsx"

# Ativar versão Mapbox
Rename-Item -Path "App_Mapbox.tsx" -NewName "App.tsx"
```

### Opção B: Manter Leaflet como padrão

Se quiser manter o Leaflet como padrão, você pode importar manualmente o Mapbox quando necessário.

## ✅ 3. Verificar Instalação

Execute para ver se as dependências foram instaladas corretamente:

```powershell
npm list mapbox-gl @mapbox/mapbox-gl-draw
```

Deve mostrar algo como:
```
├── mapbox-gl@3.1.2
└── @mapbox/mapbox-gl-draw@1.4.3
```

## 🚀 4. Iniciar o Projeto

```powershell
npm run dev
```

O projeto deve iniciar em `http://localhost:5173`

## 🎯 5. Funcionalidades do Mapbox

### Mapa Base
- Estilo: Satellite Streets (satélite com rótulos)
- Token já configurado no código

### Modo 3D
- Botão "Modo 3D" na barra lateral
- Ativa terreno 3D com exagero de 1.5x
- Pitch de 60° para visualização 3D
- Sky atmosphere para realismo

### Controles Incluídos
- ✅ Navegação (zoom, rotação)
- ✅ Fullscreen
- ✅ Escala
- ✅ Desenho de polígonos

### Interface Responsiva
- Desktop: Sidebar expandida, efeitos hover
- Touch: Sidebar colapsável, botões maiores
- Auto-detecção de dispositivos touch

## 📱 6. Dispositivos Touch

Em dispositivos touch, a interface automaticamente:
- Colapsa a sidebar por padrão
- Aumenta o tamanho dos botões (min 44x44px)
- Remove efeitos hover
- Adiciona scrollbars customizadas
- Botão toggle para abrir/fechar sidebar

## 🔄 7. Voltar para Leaflet (se necessário)

Se encontrar problemas e quiser voltar ao Leaflet:

```powershell
cd frontend/src
Remove-Item "App.tsx"
Rename-Item -Path "App_Leaflet_BACKUP.tsx" -NewName "App.tsx"
```

## 🎨 8. Estilos Adicionados

Os seguintes estilos foram adicionados ao `App.css`:
- Estilos específicos do Mapbox GL
- Controles customizados
- Botão 3D com gradiente
- Estilos para dispositivos touch
- Estilos para desktop
- Responsividade mobile
- Acessibilidade

## 🐛 9. Troubleshooting

### Erro: "Cannot find module 'mapbox-gl'"
```powershell
npm install mapbox-gl@3.1.2
```

### Erro: "Cannot find module '@mapbox/mapbox-gl-draw'"
```powershell
npm install @mapbox/mapbox-gl-draw@1.4.3
```

### Erro de TypeScript
```powershell
npm install --save-dev @types/mapbox-gl @types/mapbox__mapbox-gl-draw
```

### Mapa não aparece
- Verifique se o token do Mapbox está configurado
- Verifique o console do navegador (F12)
- Token atual: `pk.eyJ1IjoiYW5kcmV3b2J4IiwiYSI6ImNtMWh2MXZ5eDBqNnQyeG9za2R1N2lwc2YifQ.7yCrlwa4nNFKpg2TcQoFQg`

## 📋 10. Comparação Leaflet vs Mapbox

| Recurso | Leaflet (Atual) | Mapbox (Novo) |
|---------|----------------|---------------|
| Mapa Base | OpenStreetMap | Satellite Streets |
| 3D | ❌ Não | ✅ Sim (terreno) |
| Performance | Boa | Excelente |
| Estilo | Limitado | Totalmente customizável |
| Mobile | Bom | Otimizado |
| Rotação | ❌ Não | ✅ Sim |
| Tilt/Pitch | ❌ Não | ✅ Sim |

## ✨ 11. Novos Recursos

### Modo 3D
- Visualização de terreno em 3D
- Exagero de elevação configurável
- Atmosfera realista
- Rotação livre

### Interface Touch-First
- Detecção automática de touch
- Sidebar colapsável em mobile
- Botões otimizados para toque
- Gestos naturais

### Performance
- Rendering WebGL nativo
- Tiles otimizados
- Transições suaves
- Melhor em dispositivos móveis

## 🎓 12. Próximos Passos

Após testar e aprovar o Mapbox:

1. Deletar o backup: `Remove-Item "App_Leaflet_BACKUP.tsx"`
2. Deletar `App_Mapbox.tsx` (já está como App.tsx)
3. Commit das mudanças
4. Deploy no Vercel

## 📞 13. Suporte

Se tiver problemas:
1. Verifique os logs do console (F12 → Console)
2. Verifique os erros do terminal
3. Confirme que todas as dependências foram instaladas
4. Teste primeiro em localhost antes de fazer deploy

---

**🎉 Pronto! Agora você tem o Mapbox configurado com 3D e interface responsiva!**
