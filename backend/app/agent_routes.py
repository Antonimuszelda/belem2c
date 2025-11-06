# backend/app/agent_routes.py - Rotas da API para o Agente Sacy
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime

# Importar agente e ferramentas no início para inicialização imediata
from .agent_sacy_chat import sacy_chat_agent
from .audio_chat import try_agent_chat, dialectize_paraense, normalize_slang
from .agent_tools import (
    list_available_images_tool,
    analyze_geojson_features_tool,
    calculate_image_statistics_tool,
    analyze_sar_data_tool,
    detect_change_tool,
    calculate_urban_heat_island_tool,
    analyze_water_bodies_tool
)

router = APIRouter(tags=["AI Agent"])

class AgentRequest(BaseModel):
    polygon_coords: List[Dict[str, float]]
    analysis_context: str
    date_range: Dict[str, str]

class AgentResponse(BaseModel):
    analysis: str
    metadata: Dict[str, Any]

class ChatMessage(BaseModel):
    message: str
    context_data: Optional[Dict[str, Any]] = None

class ChatResponse(BaseModel):
    response: str
    context_summary: str

@router.post("/analyze", response_model=AgentResponse)
async def analyze_with_sacy(request: AgentRequest):
    """
    🤖 Análise de IA com agente Sacy (Google ADK + Gemini)
    
    Recebe uma área, busca dados de satélite (NDVI, NDWI, LST)
    e retorna uma análise de IA sobre os indicadores.
    """
    # Import dinâmico para evitar erro se não configurado
    try:
        from .agent_sacy_improved import sacy_agent
        from .main import get_analysis_data, AnalysisDataRequest
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Agente Sacy ou dependências não disponíveis. Erro: {str(e)}"
        )
    
    if sacy_agent is None:
        raise HTTPException(
            status_code=503,
            detail="Agente Sacy não inicializado. Verifique GOOGLE_API_KEY."
        )
    
    if not request.polygon_coords or len(request.polygon_coords) < 3:
        raise HTTPException(status_code=400, detail="Polígono inválido.")
    
    try:
        # 1. Buscar dados de análise (NDVI, NDWI, LST)
        analysis_data_req = AnalysisDataRequest(
            polygon=request.polygon_coords,
            start_date=request.date_range['start'],
            end_date=request.date_range['end']
        )
        analysis_data = await get_analysis_data(analysis_data_req)

        # 2. Chamar o agente com os dados extraídos
        analysis_result = sacy_agent.analyze_region(
            polygon_coords=request.polygon_coords,
            analysis_data=analysis_data.dict(),
            analysis_context=request.analysis_context
        )
        
        return AgentResponse(
            analysis=analysis_result,
            metadata={
                "agent": "Sacy",
                "model": sacy_agent.agent.model,
                "timestamp": datetime.now().isoformat(),
                "region_points": len(request.polygon_coords),
                "data_source": analysis_data.satellite_source,
                "analysis_period": analysis_data.period,
                "input_stats": analysis_data.stats,
                "status": "success"
            }
        )
    
    except HTTPException as e:
        # Repassar HTTPExceptions do get_analysis_data
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro no processo de análise: {str(e)}"
        )

@router.get("/health")
async def agent_health():
    """
    🏥 Verificar status do agente Sacy
    
    Endpoint de health check para verificar se o agente está operacional
    """
    try:
        from .agent_sacy_improved import sacy_agent
        
        if sacy_agent is None:
            return {
                "status": "unavailable",
                "message": "Agente não inicializado. Configure GOOGLE_API_KEY.",
                "timestamp": datetime.now().isoformat()
            }
        
        return {
            "status": "ok",
            "agent": "Sacy",
            "model": "gemini-2.0-flash-exp",
            "description": "Assistente de análise geoespacial",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Agente indisponível: {str(e)}"
        )

@router.post("/chat", response_model=ChatResponse)
async def chat_with_sacy(request: ChatMessage):
    """
    💬 Chat interativo com o agente Sacy
    
    Permite conversar com o agente, fazendo perguntas sobre a área de estudo.
    O agente tem acesso a todos os dados carregados e pode executar ferramentas.
    """
    
    if sacy_chat_agent is None:
        raise HTTPException(
            status_code=503,
            detail="Agente Sacy Chat não inicializado. Verifique GOOGLE_API_KEY."
        )
    
    try:
        # Atualizar contexto se fornecido
        if request.context_data:
            sacy_chat_agent.update_context(
                polygon=request.context_data.get('polygon'),
                satellite_layers=request.context_data.get('satellite_layers'),
                geojson_data=request.context_data.get('geojson_data'),
                metadata=request.context_data.get('metadata'),
                start_date=request.context_data.get('start_date'),
                end_date=request.context_data.get('end_date')
            )
        
        # Detectar se usuário quer executar ferramentas
        message_lower = request.message.lower()
        polygon = sacy_chat_agent.context_data.get('polygon')
        geojson = sacy_chat_agent.context_data.get('geojson_data')
        start_date = sacy_chat_agent.context_data.get('start_date')
        end_date = sacy_chat_agent.context_data.get('end_date')
        
        tool_results = []
        
        # 1. Verificar se precisa buscar imagens
        if polygon and any(keyword in message_lower for keyword in ['imagem', 'lst', 'ndvi', 'ndwi', 'menos nuvens', 'lista', 'disponível', 'disponivel']):
            layer_type = None
            if 'lst' in message_lower or 'temperatura' in message_lower or 'calor' in message_lower:
                layer_type = 'LST'
            elif 'ndvi' in message_lower or 'vegetação' in message_lower or 'vegetacao' in message_lower:
                layer_type = 'NDVI'
            elif 'ndwi' in message_lower or 'água' in message_lower or 'agua' in message_lower:
                layer_type = 'NDWI'
            
            if layer_type and start_date and end_date:
                images_result = list_available_images_tool(
                    polygon_coords=polygon,
                    layer_type=layer_type,
                    start_date=start_date,
                    end_date=end_date,
                    max_results=10
                )
                tool_results.append(images_result)
        
        # 2. Verificar se precisa analisar GeoJSON
        if geojson and any(keyword in message_lower for keyword in ['municípios', 'municipios', 'favelas', 'comunidades', 'setores', 'quantas', 'quantos', 'bairros']):
            geojson_result = analyze_geojson_features_tool(
                geojson_data=geojson,
                polygon_coords=polygon if polygon else None
            )
            tool_results.append(geojson_result)
        
        # 3. Verificar se precisa calcular estatísticas
        if polygon and any(keyword in message_lower for keyword in ['temperatura média', 'media', 'média', 'estatística', 'estatistica', 'mais intensa', 'mais quente', 'mais frio']):
            layer_type = None
            if 'lst' in message_lower or 'temperatura' in message_lower or 'calor' in message_lower:
                layer_type = 'LST'
            elif 'ndvi' in message_lower or 'vegetação' in message_lower or 'vegetacao' in message_lower:
                layer_type = 'NDVI'
            
            if layer_type and start_date and end_date:
                stats_result = calculate_image_statistics_tool(
                    polygon_coords=polygon,
                    layer_type=layer_type,
                    start_date=start_date,
                    end_date=end_date
                )
                tool_results.append(stats_result)
        
        # 4. Verificar se precisa análise SAR (radar)
        if polygon and any(keyword in message_lower for keyword in ['sar', 'radar', 'sentinel-1', 'inundação', 'inundacao', 'alaga', 'enchente', 'alagamento']):
            if start_date and end_date:
                sar_result = analyze_sar_data_tool(
                    polygon_coords=polygon,
                    start_date=start_date,
                    end_date=end_date,
                    polarization='VV'
                )
                tool_results.append(sar_result)
        
        # 5. Verificar se precisa análise de ilha de calor
        if polygon and any(keyword in message_lower for keyword in ['ilha de calor', 'uhi', 'calor urbano', 'urbana']):
            if start_date:
                uhi_result = calculate_urban_heat_island_tool(
                    polygon_coords=polygon,
                    date=start_date
                )
                tool_results.append(uhi_result)
        
        # 6. Verificar se precisa análise de corpos d'água
        if polygon and any(keyword in message_lower for keyword in ['água', 'agua', 'rio', 'lago', 'córrego', 'corrego', 'umidade', 'úmida']):
            if start_date:
                water_result = analyze_water_bodies_tool(
                    polygon_coords=polygon,
                    date=start_date
                )
                tool_results.append(water_result)
        
        # Processar mensagem com resultados das ferramentas
        if tool_results:
            # Formatar resultados de forma natural, SEM mencionar ferramentas
            data_context = "\n\n**DADOS ENCONTRADOS:**\n"
            for result in tool_results:
                if result.get('success'):
                    # Adicionar dados relevantes de forma natural
                    if 'layer_type' in result:
                        data_context += f"\nCamada {result['layer_type']}: "
                        if 'mean' in result:
                            data_context += f"média de {result['mean']:.2f}{result.get('unit', '')}, "
                        if 'best_image' in result:
                            data_context += f"melhor imagem em {result['best_image'].get('date')}, "
                    if 'data_type' in result and result['data_type'] == 'SAR':
                        data_context += f"\nDados de radar: {result.get('interpretation', '')}"
                    if 'uhi_intensity' in result:
                        data_context += f"\nIlha de calor: {result['uhi_intensity']:.1f}°C ({result['classification']})"
                    if 'water_percentage' in result:
                        data_context += f"\nÁgua: {result['interpretation']}"
                    if 'total_features' in result:
                        data_context += f"\nEncontradas {result['total_features']} features"
            
            enriched_message = f"""{request.message}

{data_context}

Responda à pergunta usando esses dados de forma natural e clara, SEM mencionar ferramentas ou processos técnicos.
"""
            enriched_message = normalize_slang(enriched_message)
            response_text = sacy_chat_agent.chat(enriched_message)
        else:
            # normalize slang before sending
            msg_norm = normalize_slang(request.message)
            response_text = sacy_chat_agent.chat(msg_norm)
        
        # Garantir que response_text é uma string válida
        if response_text is None or not isinstance(response_text, str) or response_text.strip() == "":
            response_text = "Desculpa, tive um problema ao processar sua mensagem. Tenta de novo?"

        # Aplicar dialetização paraense antes de retornar (compatível com client-side TTS)
        try:
            response_text = dialectize_paraense(response_text)
        except Exception:
            # Se algo der errado, continuar com o texto original
            pass

        context_summary = sacy_chat_agent.get_context_summary()

        return ChatResponse(
            response=response_text,
            context_summary=context_summary
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro no chat: {str(e)}"
        )


@router.post("/chat/text", response_model=ChatResponse)
async def chat_text_quick(request: ChatMessage):
    """Endpoint leve para Railway: recebe texto (ex: vindo do Web Speech API no cliente),
    usa o agente se disponível ou fallback local, dialetiza a resposta e retorna JSON.
    """
    try:
        # Se o agente existir, atualize contexto quando fornecido
        if request.context_data and sacy_chat_agent is not None:
            sacy_chat_agent.update_context(
                polygon=request.context_data.get('polygon'),
                satellite_layers=request.context_data.get('satellite_layers'),
                geojson_data=request.context_data.get('geojson_data'),
                metadata=request.context_data.get('metadata'),
                start_date=request.context_data.get('start_date'),
                end_date=request.context_data.get('end_date')
            )

        # Tentar usar o agente, senão usar fallback
        # normalize slang first
        msg_norm = normalize_slang(request.message)
        response_text = try_agent_chat(sacy_chat_agent, msg_norm)
        
        # Garantir que response_text é uma string válida
        if response_text is None or not isinstance(response_text, str) or response_text.strip() == "":
            response_text = "Desculpa, tive um problema ao processar sua mensagem. Tenta de novo?"

        # Dialetizar
        try:
            response_text = dialectize_paraense(response_text)
        except Exception:
            pass

        context_summary = sacy_chat_agent.get_context_summary() if sacy_chat_agent is not None else ""

        return ChatResponse(response=response_text, context_summary=context_summary)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro no chat texto: {str(e)}")