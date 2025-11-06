# backend/app/agent_sacy.py - Agente Sacy usando Google Generative AI
import os
from datetime import datetime
from typing import Dict, Any, List
import google.generativeai as genai
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

class SacyAgent:
    """
    Agente de IA Sacy para análise geoespacial.
    Usa Google Gemini diretamente (google-generativeai).
    """
    
    def __init__(self):
        api_key = os.getenv('GOOGLE_API_KEY')
        if not api_key:
            raise ValueError("❌ GOOGLE_API_KEY não configurada no ambiente!")
        
        # Configurar Gemini
        genai.configure(api_key=api_key)
        
        # Modelo com instruções de sistema
        self.model = genai.GenerativeModel(
            model_name='gemini-2.0-flash-exp',
            system_instruction="""
            Você é Sacy 🍃, um especialista em sensoriamento remoto e análise de dados geoespaciais para o Brasil.
            Sua missão é interpretar dados numéricos de satélite e fornecer uma análise clara, objetiva e acionável.

            **RESPONSABILIDADES:**
            1.  **Analisar Indicadores:** Interprete os valores médios de NDVI, NDWI e LST (Temperatura da Superfície).
            2.  **Contextualizar:** Relacione os indicadores com o bioma brasileiro, a época do ano e o contexto da análise.
            3.  **Identificar Riscos:** Aponte potenciais riscos como estresse hídrico, baixa vegetação, ilhas de calor urbanas, etc.
            4.  **Formato Estruturado:** Siga RIGOROSAMENTE o formato de resposta abaixo. Use emojis para clareza.

            **FORMATO DE RESPOSTA OBRIGATÓRIO:**

            📊 **SÍNTESE DA ANÁLISE**
            [Forneça um parágrafo curto resumindo as principais conclusões da análise da área e período.]

            🌿 **ÍNDICE DE VEGETAÇÃO (NDVI)**
            - **Valor Médio:** [Valor do NDVI]
            - **Interpretação:** [Explique o que o valor significa. Ex: "Vegetação densa e saudável", "Área com pouca ou nenhuma vegetação", "Possível área agrícola ou pastagem".]

            � **ÍNDICE DE ÁGUA (NDWI)**
            - **Valor Médio:** [Valor do NDWI]
            - **Interpretação:** [Explique o que o valor significa. Ex: "Presença de corpos d'água abertos", "Baixa umidade na superfície", "Área com estresse hídrico".]

            🔥 **TEMPERATURA DA SUPERFÍCIE (LST)**
            - **Valor Médio:** [Valor do LST em °C]
            - **Interpretação:** [Explique o que o valor significa. Ex: "Temperatura amena, típica de áreas vegetadas", "Alta temperatura, sugestivo de área urbana densa ou solo exposto", "Potencial para formação de ilhas de calor."].

            ⚠️ **ALERTAS E RECOMENDAÇÕES**
            [Com base nos três indicadores, liste os principais alertas em formato de bullet points. Ex: "- ALERTA: A combinação de baixo NDVI e alta temperatura pode indicar risco de desertificação."].
            [Forneça recomendações práticas. Ex: "- RECOMENDAÇÃO: Realizar análise de campo para verificar a saúde da vegetação."].
            """
        )
    
    def analyze_region(
        self,
        polygon_coords: List[Dict[str, float]],
        analysis_data: Dict[str, Any],
        analysis_context: str
    ) -> str:
        """
        Analisa uma região com base em dados de satélite extraídos.
        """
        
        num_points = len(polygon_coords)
        avg_lat = sum(c['lat'] for c in polygon_coords) / num_points
        avg_lng = sum(c['lng'] for c in polygon_coords) / num_points
        
        stats = analysis_data.get('stats', {})
        period = analysis_data.get('period', {})

        # Montar prompt contextual com os dados numéricos
        user_message = f"""
**DADOS PARA ANÁLISE:**

📍 **Localização:**
- Centro Aproximado: Lat {avg_lat:.4f}, Lng {avg_lng:.4f}
- Área definida por {num_points} pontos.

📅 **Período de Análise:**
- De: {period.get('start')}
- Até: {period.get('end')}

🛰️ **Fonte dos Dados:**
- {analysis_data.get('satellite_source')}

� **INDICADORES EXTRAÍDOS (Valores Médios):**
- **NDVI (Índice de Vegetação):** `{stats.get('ndvi_mean'):.4f}`
- **NDWI (Índice de Água):** `{stats.get('ndwi_mean'):.4f}`
- **LST (Temperatura da Superfície):** `{stats.get('lst_mean_celsius'):.2f} °C`

🎯 **Contexto da Análise Fornecido pelo Usuário:**
{analysis_context}

---
**INSTRUÇÕES:**
Com base nos dados numéricos acima, realize a análise geoespacial seguindo estritamente o formato e as diretrizes definidas para você.
"""
        
        try:
            response = self.model.generate_content(user_message)
            return response.text
            
        except Exception as e:
            error_msg = f"""
❌ **ERRO NA ANÁLISE DO SACY**

**Detalhes técnicos:** {str(e)}

Ocorreu um erro ao comunicar com a API do Google. Verifique sua chave de API e cotas.
"""
            return error_msg

# Instância global (singleton)
try:
    sacy_agent = SacyAgent()
    print("✅ Agente Sacy inicializado com sucesso!")
except Exception as e:
    print(f"⚠️ Aviso: Não foi possível inicializar o agente Sacy: {e}")
    sacy_agent = None