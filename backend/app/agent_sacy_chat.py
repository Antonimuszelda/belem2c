# backend/app/agent_sacy_chat.py - Agente Sacy com chat interativo usando ADK
import os
from typing import Dict, Any, List, Optional
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

class SacyChatAgent:
    """
    Agente de IA Sacy para chat interativo sobre análise geoespacial.
    Mantém contexto de dados carregados (polígono, camadas, GeoJSON).
    Usa google-adk (Agentic Development Kit) - GRATUITO e sem limites de quota.
    """
    
    def __init__(self):
        api_key = os.getenv('GOOGLE_API_KEY')
        if not api_key:
            raise ValueError("❌ GOOGLE_API_KEY não configurada!")
        
        # Configurar cliente ADK
        self.client = genai.Client(api_key=api_key)
        
        # Contexto do agente
        self.context_data = {
            'polygon': None,
            'satellite_layers': {},
            'geojson_data': None,
            'analysis_metadata': {},
            'start_date': None,
            'end_date': None
        }
        
        # System instruction para o modelo
        self.system_instruction = """
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
            - ADAPTE o ton ao contexto (sério para dados importantes, leve para conversa casual)
            - FALE como se você mesmo tivesse observado/visto os dados
            """
        
        # Histórico de mensagens para manter contexto
        self.chat_history: List[types.Content] = []
    
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
        """Processa mensagem do usuário com contexto usando ADK."""
        import time
        
        context_summary = self.get_context_summary()
        
        # Montar prompt completo com system instruction e contexto
        full_prompt = f"""{self.system_instruction}

**CONTEXTO ATUAL:**
{context_summary}

---
**USUÁRIO:**
{user_message}
"""
        
        # Retry com backoff exponencial para rate limiting
        max_retries = 3
        base_delay = 1  # segundos
        
        for attempt in range(max_retries):
            try:
                # Usar ADK para gerar resposta
                # Adicionar mensagem do usuário ao histórico
                user_content = types.Content(
                    role="user",
                    parts=[types.Part(text=full_prompt)]
                )
                
                # Gerar resposta usando ADK
                response = self.client.models.generate_content(
                    model='gemini-2.0-flash-exp',
                    contents=[user_content] + self.chat_history,
                    config=types.GenerateContentConfig(
                        temperature=0.7,
                        top_p=0.95,
                        top_k=40,
                        max_output_tokens=2048,
                    )
                )
                
                # Extrair texto da resposta
                response_text = response.text
                
                # Atualizar histórico
                self.chat_history.append(user_content)
                self.chat_history.append(types.Content(
                    role="model",
                    parts=[types.Part(text=response_text)]
                ))
                
                # Manter histórico limitado (últimas 20 mensagens)
                if len(self.chat_history) > 20:
                    self.chat_history = self.chat_history[-20:]
                
                return response_text
                
            except Exception as e:
                error_msg = str(e)
                
                # Se for erro de rate limiting e ainda tem tentativas
                if ("429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg) and attempt < max_retries - 1:
                    delay = base_delay * (2 ** attempt)  # Backoff exponencial: 1s, 2s, 4s
                    print(f"⏳ Rate limit atingido. Aguardando {delay}s antes de tentar novamente...")
                    time.sleep(delay)
                    continue
                
                # Se esgotou as tentativas ou é outro erro
                if "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg:
                    return "⏳ **Sistema muito ocupado.** Aguarde alguns segundos e tente novamente."
                
                return f"❌ **ERRO:** {error_msg}\n\nVerifique sua configuração."
        
        return "⏳ **Sistema muito ocupado.** Por favor, aguarde e tente novamente."

# Instância global
print("🔄 Tentando inicializar Sacy Chat Agent...")
try:
    sacy_chat_agent = SacyChatAgent()
    print("✅ Sacy Chat Agent inicializado com ADK!")
except Exception as e:
    print(f"⚠️ Aviso: Não foi possível inicializar Sacy Chat: {e}")
    import traceback
    traceback.print_exc()
    sacy_chat_agent = None
