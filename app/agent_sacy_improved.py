# backend/app/agent_sacy_improved.py - Agente Sacy MELHORADO com FUNCTION CALLING
import os
import json
from datetime import datetime
from typing import Dict, Any, List, Optional
from google.genai import Client
from google.genai.types import Tool, FunctionDeclaration, GenerateContentConfig
from dotenv import load_dotenv
import requests

# Importar ferramentas
from .agent_tools import (
    list_available_images_tool,
    analyze_geojson_features_tool,
    calculate_image_statistics_tool
)

# Carregar variáveis de ambiente
load_dotenv()

class SacyAgentImproved:
    """
    Agente de IA Sacy MELHORADO com ACESSO TOTAL às ferramentas.
    
    CAPACIDADES EXECUTÁVEIS:
    - 🛰️ Buscar e listar imagens de satélite
    - 📊 Calcular estatísticas (LST, NDVI, NDWI)
    - 🗺️ Analisar dados GeoJSON (municípios, favelas, setores)
    - 📍 Identificar localização via geocoding
    - 🎨 Interpretar cores das imagens
    - 💬 Conversar e responder perguntas
    """
    
    def __init__(self):
        api_key = os.getenv('GOOGLE_API_KEY')
        if not api_key:
            raise ValueError("❌ GOOGLE_API_KEY não configurada no ambiente!")
        
        # Cliente Google Genai (ADK gratuito)
        self.client = Client(api_key=api_key)
        self.model_name = 'gemini-2.0-flash-exp'
        
        # Definir ferramentas disponíveis para function calling
        self.tools = [
            Tool(function_declarations=[
                FunctionDeclaration(
                    name="list_available_images",
                    description="Busca imagens de satélite disponíveis para uma área e período. Use quando o usuário pedir para 'listar imagens', 'mostrar imagens', 'quais imagens', 'menos nuvens', etc.",
                    parameters={
                        "type": "object",
                        "properties": {
                            "layer_type": {
                                "type": "string",
                                "description": "Tipo de camada: LST (temperatura), NDVI (vegetação), NDWI (água), UHI (ilha de calor), UTFVI, DEM",
                                "enum": ["LST", "NDVI", "NDWI", "UHI", "UTFVI", "DEM"]
                            },
                            "start_date": {
                                "type": "string",
                                "description": "Data inicial no formato YYYY-MM-DD"
                            },
                            "end_date": {
                                "type": "string",
                                "description": "Data final no formato YYYY-MM-DD"
                            },
                            "max_results": {
                                "type": "integer",
                                "description": "Número máximo de resultados (padrão 50)",
                                "default": 50
                            }
                        },
                        "required": ["layer_type", "start_date", "end_date"]
                    }
                ),
                FunctionDeclaration(
                    name="calculate_statistics",
                    description="Calcula estatísticas (média, min, max) de um índice para a área no período. Use quando pedir 'temperatura média', 'NDVI médio', 'mais intensa', 'estatísticas', etc.",
                    parameters={
                        "type": "object",
                        "properties": {
                            "layer_type": {
                                "type": "string",
                                "description": "Tipo de índice: LST, NDVI, NDWI",
                                "enum": ["LST", "NDVI", "NDWI"]
                            },
                            "start_date": {
                                "type": "string",
                                "description": "Data inicial YYYY-MM-DD"
                            },
                            "end_date": {
                                "type": "string",
                                "description": "Data final YYYY-MM-DD"
                            }
                        },
                        "required": ["layer_type", "start_date", "end_date"]
                    }
                ),
                FunctionDeclaration(
                    name="analyze_geojson",
                    description="Analisa dados GeoJSON (municípios, favelas, setores censitários) na área selecionada. Use quando pedir 'quantos municípios', 'quais favelas', 'setores', 'comunidades', etc.",
                    parameters={
                        "type": "object",
                        "properties": {
                            "filter_by": {
                                "type": "string",
                                "description": "Filtrar por propriedade específica (opcional)"
                            }
                        }
                    }
                )
            ])
        ]
        
        # System instruction AVANÇADO
        self.system_instruction = """
Você é JATAÍ 🐝, o copiloto ambiental paraense - um assistente esperto e gente boa que manja de satélites!

**PERSONALIDADE PARAENSE:**
- Fala de boa, como um parente que conhece o assunto
- Usa gírias paraenses naturalmente (1-2 por resposta, sem forçar):
  • **Égua**: surpresa ("Égua, essa temperatura tá alta!")
  • **De boa/De rocha**: confirmação ("Isso tá de rocha!")
  • **Maninho/Parente**: tratar o usuário
  • **Disk**: ironia leve ("Disk aqui alaga sempre!")
  • **Ulha**: chamar atenção ("Ulha, olha só!")
  • **Massa/Sinistro**: algo legal
  • **Pior que sim**: confirmação enfática
- Seja direto e conciso
- Use emojis com moderação
- Seja técnico quando necessário, mas sempre explique de forma clara

**🛠️ FERRAMENTAS QUE VOCÊ PODE USAR:**
1. `list_available_images`: Buscar imagens de satélite (LST, NDVI, NDWI)
2. `calculate_statistics`: Calcular estatísticas de índices
3. `analyze_geojson`: Analisar municípios, favelas, setores censitários

**QUANDO USAR FERRAMENTAS:**
- Usuário pede "me mostre imagens de LST" → use list_available_images
- Usuário pede "qual a temperatura média" → use calculate_statistics
- Usuário pede "quantas favelas" → use analyze_geojson
- SEMPRE use ferramentas quando possível ANTES de responder!

**🎨 TABELA DE CORES:**

**NDVI (Vegetação):**
- Vermelho/Marrom (-1 a 0): Água, solo exposto, construções
- Amarelo (0 a 0.2): Solo nu, urbanização
- Verde claro (0.2 a 0.4): Vegetação esparsa
- Verde médio (0.4 a 0.6): Vegetação moderada
- Verde escuro (0.6 a 1): Floresta densa

**NDWI (Água):**
- Marrom (-1 a -0.3): Solo seco, urbano
- Amarelo (-0.3 a 0): Vegetação seca
- Verde (0 a 0.2): Umidade moderada
- Azul claro (0.2 a 0.5): Alta umidade
- Azul escuro (0.5 a 1): Corpos d'água

**LST (Temperatura):**
- Azul (< 20°C): Frio
- Verde (20-25°C): Moderado
- Amarelo (25-30°C): Quente
- Laranja (30-35°C): Muito quente
- Vermelho (> 35°C): Extremo/ilha de calor

**FORMATO DE RESPOSTA:**

📊 **AÇÃO EXECUTADA**
[Se usou ferramenta, descreva o que fez]

🔍 **RESULTADOS**
[Apresente os dados obtidos]

� **INTERPRETAÇÃO**
[Explique o significado com cores e contexto]

⚠️ **ALERTAS**
[Riscos e recomendações]

**REGRAS:**
- Seja paraense de verdade, não force
- Respostas curtas quando possível (2-4 linhas)
- Respostas longas só para análises técnicas
- Sempre explique cores dos mapas
- Seja respeitoso com vulnerabilidade social
- **NUNCA mencione "executei ferramenta", "usei", "analisei com" - fale como se você tivesse visto os dados**

**EXEMPLOS DE CONVERSA:**

Ruim ❌: "Executei a ferramenta calculate_statistics e obtive LST médio de 32°C..."
Bom ✅: "Égua, tá quente mesmo! Vi que a temperatura média tá em 32°C - áreas em laranja/vermelho no mapa."

Ruim ❌: "Utilizando a ferramenta analyze_geojson, identifiquei 15 favelas..."
Bom ✅: "Achei 15 favelas na área que você marcou, parente. Quer saber mais sobre alguma?"

Ruim ❌: "Através da análise NDVI com valores de 0.7..."
Bom ✅: "Massa de vegetação aqui! Tá bem verde (NDVI 0.7) - isso é floresta densa."
"""
    
    def get_municipality_from_coords(self, lat: float, lng: float) -> Optional[str]:
        """
        Identifica o município brasileiro a partir de coordenadas usando Nominatim (OpenStreetMap).
        GRATUITO e sem necessidade de API key.
        """
        try:
            url = "https://nominatim.openstreetmap.org/reverse"
            params = {
                'lat': lat,
                'lon': lng,
                'format': 'json',
                'addressdetails': 1,
                'accept-language': 'pt-BR'
            }
            headers = {
                'User-Agent': 'Sentinel-IA-Sacy/1.0'
            }
            
            response = requests.get(url, params=params, headers=headers, timeout=5)
            
            if response.status_code == 200:
                data = response.json()
                address = data.get('address', {})
                
                # Extrair informações
                city = address.get('city') or address.get('town') or address.get('village') or address.get('municipality')
                state = address.get('state')
                
                if city and state:
                    return f"{city}, {state}"
                elif city:
                    return city
                elif state:
                    return state
                    
            return None
        except Exception as e:
            print(f"⚠️ Erro ao buscar município: {e}")
            return None
    
    def chat(
        self,
        user_message: str,
        polygon_coords: Optional[List[Dict[str, float]]] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        geojson_data: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Chat interativo com function calling.
        O agente pode executar ferramentas automaticamente.
        """
        try:
            # Preparar contexto
            context_parts = []
            
            if polygon_coords and len(polygon_coords) >= 3:
                avg_lat = sum(p['lat'] for p in polygon_coords) / len(polygon_coords)
                avg_lng = sum(p['lng'] for p in polygon_coords) / len(polygon_coords)
                municipality = self.get_municipality_from_coords(avg_lat, avg_lng)
                
                context_parts.append(f"""
**CONTEXTO DISPONÍVEL:**
📍 Área: {len(polygon_coords)} pontos, centro em ({avg_lat:.4f}, {avg_lng:.4f})
{f'📌 Local: {municipality}' if municipality else ''}
""")
            
            if start_date and end_date:
                context_parts.append(f"📅 Período: {start_date} a {end_date}")
            
            if geojson_data:
                features = geojson_data.get('features', [])
                if features:
                    context_parts.append(f"🗺️ GeoJSON: {len(features)} features disponíveis")
            
            full_message = "\n".join(context_parts) + f"\n\n**USUÁRIO:** {user_message}"
            
            # Gerar resposta com function calling
            config = GenerateContentConfig(
                system_instruction=self.system_instruction,
                temperature=0.7,
                tools=self.tools
            )
            
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=full_message,
                config=config
            )
            
            # Processar function calls
            if response and response.candidates and len(response.candidates) > 0:
                candidate = response.candidates[0]
                if hasattr(candidate, 'content') and candidate.content and hasattr(candidate.content, 'parts'):
                    for part in candidate.content.parts:
                        if part and hasattr(part, 'function_call') and part.function_call:
                            # Executar a ferramenta
                            function_name = part.function_call.name
                            args = dict(part.function_call.args) if hasattr(part.function_call, 'args') else {}
                            
                            result = self._execute_tool(
                                function_name, 
                                args, 
                                polygon_coords, 
                                geojson_data
                            )
                            
                            # Gerar resposta final com os resultados
                            final_prompt = f"{full_message}\n\n**RESULTADO DA FERRAMENTA {function_name}:**\n{json.dumps(result, indent=2, ensure_ascii=False)}\n\nInterprete esses resultados."
                            
                            final_response = self.client.models.generate_content(
                                model=self.model_name,
                                contents=final_prompt,
                                config=GenerateContentConfig(
                                    system_instruction=self.system_instruction,
                                    temperature=0.7
                                )
                            )
                            
                            return final_response.text
            
            return response.text if response else "❌ Resposta vazia do modelo"
            
        except Exception as e:
            return f"❌ **ERRO:** {str(e)}"
    
    def _execute_tool(
        self,
        function_name: str,
        args: Dict[str, Any],
        polygon_coords: Optional[List[Dict[str, float]]],
        geojson_data: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Executa uma ferramenta chamada pelo agente."""
        try:
            if function_name == "list_available_images":
                return list_available_images_tool(
                    polygon_coords=polygon_coords or [],
                    layer_type=args.get('layer_type'),
                    start_date=args.get('start_date'),
                    end_date=args.get('end_date'),
                    max_results=args.get('max_results', 50)
                )
            
            elif function_name == "calculate_statistics":
                return calculate_image_statistics_tool(
                    polygon_coords=polygon_coords or [],
                    layer_type=args.get('layer_type'),
                    start_date=args.get('start_date'),
                    end_date=args.get('end_date')
                )
            
            elif function_name == "analyze_geojson":
                return analyze_geojson_features_tool(
                    geojson_data=geojson_data or {},
                    polygon_coords=polygon_coords,
                    filter_by=args.get('filter_by')
                )
            
            else:
                return {"error": f"Ferramenta desconhecida: {function_name}"}
                
        except Exception as e:
            return {"error": str(e)}
    
    def analyze_region(
        self,
        polygon_coords: List[Dict[str, float]],
        analysis_data: Dict[str, Any],
        analysis_context: str
    ) -> str:
        """
        Analisa uma região com base em dados de satélite extraídos.
        (Mantido para compatibilidade com endpoint /api/agent/analyze)
        """
        
        num_points = len(polygon_coords)
        avg_lat = sum(c['lat'] for c in polygon_coords) / num_points
        avg_lng = sum(c['lng'] for c in polygon_coords) / num_points
        
        stats = analysis_data.get('stats', {})
        period = analysis_data.get('period', {})
        
        # Identificar município
        municipality = self.get_municipality_from_coords(avg_lat, avg_lng)
        location_info = f"📍 **Município Identificado:** {municipality}\n" if municipality else ""

        # Montar prompt contextual
        user_message = f"""
**DADOS PARA ANÁLISE PROFUNDA:**

📍 **Localização:**
{location_info}- Centro Aproximado: Lat {avg_lat:.4f}, Lng {avg_lng:.4f}
- Área definida por {num_points} pontos

📅 **Período de Análise:**
- De: {period.get('start')}
- Até: {period.get('end')}

🛰️ **Fonte dos Dados:**
- {analysis_data.get('satellite_source')}

📊 **INDICADORES EXTRAÍDOS (Valores Médios):**
- **NDVI (Índice de Vegetação):** `{stats.get('ndvi_mean', 0):.4f}`
- **NDWI (Índice de Água):** `{stats.get('ndwi_mean', 0):.4f}`
- **LST (Temperatura da Superfície):** `{stats.get('lst_mean_celsius', 0):.2f} °C`

🎯 **Contexto da Análise Fornecido pelo Usuário:**
{analysis_context}

---
**INSTRUÇÕES:**
Realize a análise geoespacial seguindo RIGOROSAMENTE o formato definido.
LEMBRE-SE: Mencione as CORES esperadas nas imagens para cada índice!
"""
        
        try:
            config = GenerateContentConfig(
                system_instruction=self.system_instruction,
                temperature=0.7
            )
            
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=user_message,
                config=config
            )
            
            return response.text
            
        except Exception as e:
            error_msg = f"""
❌ **ERRO NA ANÁLISE DO SACY**

**Detalhes técnicos:** {str(e)}

Ocorreu um erro ao comunicar com a API do Google. Verifique sua chave de API e cotas.
"""
            return error_msg

# Instância global melhorada
try:
    sacy_agent = SacyAgentImproved()
    print("✅ Agente Sacy MELHORADO inicializado com sucesso!")
except Exception as e:
    print(f"⚠️ Aviso: Não foi possível inicializar o agente Sacy: {e}")
    sacy_agent = None
