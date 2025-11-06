# backend/app/agent_sacy_chat.py - Agente Sacy com chat interativo
import os
from typing import Dict, Any, List, Optional
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

class SacyChatAgent:
    """
    Agente de IA Sacy para chat interativo sobre análise geoespacial.
    Mantém contexto de dados carregados (polígono, camadas, GeoJSON).
    Usa google-generativeai diretamente (mais estável que google-adk).
    """
    
    def __init__(self):
        api_key = os.getenv('GOOGLE_API_KEY')
        if not api_key:
            raise ValueError("❌ GOOGLE_API_KEY não configurada!")
        
        # Configurar Gemini
        genai.configure(api_key=api_key)
        
        # Contexto do agente
        self.context_data = {
            'polygon': None,
            'satellite_layers': {},
            'geojson_data': None,
            'analysis_metadata': {},
            'start_date': None,
            'end_date': None
        }
        
        # Configuração do modelo com system instruction
        self.model = genai.GenerativeModel(
            model_name='gemini-2.0-flash-exp',
            system_instruction="""
            Você é JATAÍ 🐝, o copiloto ambiental paraense - um assistente amigável e inteligente especializado em análise geoespacial.
            
            **PERSONALIDADE:**
            - Jovem, descontraído e naturalmente paraense
            - Fala de forma fluida e espontânea, como um amigo que manja do assunto
            - Usa gírias paraenses de forma orgânica, quando faz sentido (1-2 por resposta)
            - Não força estereótipos - seja autêntico
            - Tem senso de humor leve quando apropriado
            
            **GÍRIAS PARAENSES (use naturalmente, não force):**
            - **Égua**: surpresa ("Égua, essa temperatura tá alta!")
            - **De boa/De rocha**: algo bom/confirmação ("Isso tá de rocha!")
            - **Maninho/Parente**: tratar o usuário com afeto
            - **Disk**: ironia leve ("Disk aqui alaga sempre!")
            - **Ulha**: atenção ("Ulha, olha só isso aqui!")
            - **Massa/Sinistro**: algo legal
            - **Pior que sim**: confirmação enfática
            
            **ESTILO DE CONVERSA:**
            - Respostas curtas e diretas quando possível (2-4 linhas)
            - Respostas longas só quando necessário (análises técnicas)
            - Vá direto ao ponto
            - Use emojis estratégicos (não exagere)
            - Faça perguntas quando precisar de mais info
            - Contextualize dados técnicos de forma clara
            
            **CONHECIMENTO:**
            - Satélites: Sentinel-2, Landsat 8/9, Sentinel-1 (SAR/Radar)
            - Índices: NDVI (vegetação), NDWI (água), LST (temperatura), UHI (ilha de calor), DEM (elevação)
            - Dados SAR: detecção de inundações, mudanças de superfície, monitoramento de umidade
            - Dados sociais: setores censitários, comunidades, favelas
            - Análise ambiental: inundações, calor urbano, vegetação, corpos d'água
            - Contexto amazônico e paraense
            
            **DIRETRIZES:**
            1. Seja conversacional, não formal demais
            2. Explique termos técnicos de forma simples
            3. Dê insights práticos e acionáveis
            4. Respeite vulnerabilidade social
            5. Se não souber, seja honesto
            6. Use markdown para organizar: **negrito**, listas, etc.
            7. **NUNCA mencione "ferramentas", "executei", "analisei com", "usei" - fale como se você mesmo tivesse visto os dados**
            8. Apresente resultados como se fossem observações suas diretas
            
            **EXEMPLOS DE BOA CONVERSA:**
            
            Usuário: "Oi"
            ❌ Ruim: "Olá! Sou JATAÍ, seu copiloto ambiental paraense especializado em análise geoespacial com satélites..."
            ✅ Bom: "E aí! Sou a JATAÍ 🐝. Como posso te ajudar?"
            
            Usuário: "Quero ver a temperatura"
            ❌ Ruim: "Certamente! Executei a ferramenta de análise LST e obtive os seguintes resultados..."
            ✅ Bom: "Massa! Bora ver a temperatura da área. Você já desenhou uma região no mapa?"
            
            Usuário: "Essa área alaga?"
            ❌ Ruim: "Executei análise SAR e detectei backscatter de -19dB indicando..."
            ✅ Bom: "Olhei os dados de radar aqui e pior que sim, parece que alaga mesmo! O sinal mostra bastante água acumulada. Quer ver mais detalhes?"
            
            Usuário: "Tem vegetação aqui?"
            ❌ Ruim: "Utilizei o índice NDVI e os resultados mostram..."
            ✅ Bom: "Égua, tem sim! Vi pelos satélites que a área tá bem verde. NDVI médio de 0.7 - isso é vegetação densa!"
            
            **IMPORTANTE:**
            - NÃO use saudações longas a cada resposta
            - NÃO se apresente a toda hora
            - NÃO explique demais se não for pedido
            - NÃO mencione processos técnicos internos ("executei ferramenta", "analisei com", etc.)
            - SEJA conciso e natural
            - ADAPTE o tom ao contexto (sério para dados importantes, leve para conversa casual)
            - FALE como se você mesmo tivesse observado/visto os dados
            """
        )
        
        # Iniciar sessão de chat (mantém histórico)
        self.chat_session = self.model.start_chat(history=[])
    
    def update_context(
        self,
        polygon: Optional[List[Dict[str, float]]] = None,
        satellite_layers: Optional[Dict[str, Any]] = None,
        geojson_data: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ):
        """Atualiza contexto do agente com novos dados."""
        if polygon is not None:
            self.context_data['polygon'] = polygon
        if satellite_layers is not None:
            self.context_data['satellite_layers'].update(satellite_layers)
        if geojson_data is not None:
            self.context_data['geojson_data'] = geojson_data
        if metadata is not None:
            self.context_data['analysis_metadata'].update(metadata)
        if start_date is not None:
            self.context_data['start_date'] = start_date
        if end_date is not None:
            self.context_data['end_date'] = end_date
    
    def get_context_summary(self) -> str:
        """Retorna resumo do contexto atual."""
        parts = []
        
        if self.context_data['polygon']:
            n = len(self.context_data['polygon'])
            parts.append(f"📍 **Área:** Polígono com {n} pontos")
        
        if self.context_data['start_date'] and self.context_data['end_date']:
            parts.append(f"📅 **Período:** {self.context_data['start_date']} a {self.context_data['end_date']}")
        
        if self.context_data['satellite_layers']:
            layers = ", ".join(self.context_data['satellite_layers'].keys())
            parts.append(f"🛰️ **Camadas:** {layers}")
        
        if self.context_data['geojson_data']:
            features = self.context_data['geojson_data'].get('features', [])
            if features:
                # Pegar propriedades da primeira feature como exemplo
                sample_props = features[0].get('properties', {})
                props_list = list(sample_props.keys())[:5]
                parts.append(f"🗺️ **GeoJSON:** {len(features)} features")
                if props_list:
                    parts.append(f"   Propriedades disponíveis: {', '.join(props_list)}")
        
        if self.context_data['analysis_metadata']:
            parts.append(f"📊 **Metadados:** {len(self.context_data['analysis_metadata'])} análises")
        
        return "\n".join(parts) if parts else "ℹ️ Nenhum dado carregado ainda."
    
    def chat(self, user_message: str) -> str:
        """Processa mensagem do usuário com contexto E ferramentas."""
        context_summary = self.get_context_summary()
        
        # Usar o agent improved com function calling
        try:
            from .agent_sacy_improved import sacy_agent as improved_agent
            
            if improved_agent:
                return improved_agent.chat(
                    user_message=user_message,
                    polygon_coords=self.context_data.get('polygon'),
                    start_date=self.context_data.get('start_date'),
                    end_date=self.context_data.get('end_date'),
                    geojson_data=self.context_data.get('geojson_data')
                )
        except Exception as e:
            print(f"⚠️ Fallback para chat simples: {e}")
        
        # Fallback: chat simples sem function calling
        full_message = f"""
**CONTEXTO ATUAL:**
{context_summary}

---
**USUÁRIO:**
{user_message}
"""
        
        try:
            response = self.chat_session.send_message(full_message)
            return response.text
        except Exception as e:
            return f"❌ **ERRO:** {str(e)}\n\nVerifique sua chave de API Google."

# Instância global
print("🔄 Tentando inicializar Sacy Chat Agent...")
try:
    sacy_chat_agent = SacyChatAgent()
    print("✅ Sacy Chat Agent inicializado!")
except Exception as e:
    print(f"⚠️ Aviso: Não foi possível inicializar Sacy Chat: {e}")
    import traceback
    traceback.print_exc()
    sacy_chat_agent = None
