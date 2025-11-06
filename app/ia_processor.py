import os
from openai import OpenAI
from dotenv import load_dotenv
import pathlib # Adiciona esta importação

# Define o caminho correto para o arquivo .env, que está na pasta 'backend'
# O 'ia_processor.py' está em 'backend/app'. O .env está em 'backend'.
env_path = pathlib.Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

# O cliente OpenAI lerá a chave do .env
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# ... (restante do código)

async def generate_ai_report(
    latitude: float, 
    longitude: float, 
    image_url: str, 
    dem_data: dict, 
    sar_data: dict, 
    ndvi_data: dict
):
    """
    Gera um relatório completo baseado nos dados geoespaciais e de satélite 
    usando o modelo GPT-4.
    """
    
    # Monta o prompt com todos os dados de contexto (incluindo os Mocks)
    context_prompt = f"""
    Gerar uma análise de monitoramento detalhada para a coordenada (Lat: {latitude}, Lon: {longitude}).
    
    --- DADOS GEOESPACIAIS E DE SATÉLITE ---
    1. Elevação (DEM): {dem_data}
    2. Índice de Vegetação (NDVI): {ndvi_data}
    3. Radar de Abertura Sintética (SAR) Análise: {sar_data}
    4. Imagem Visual: {image_url} (Para contexto, se o modelo puder acessá-lo via URL)
    
    --- TAREFA DE ANÁLISE ---
    1. Avalie a condição geral da vegetação com base no NDVI.
    2. Avalie o risco de inundação ou mudança no terreno com base nos dados SAR e de elevação.
    3. Gere um relatório conciso, profissional e estruturado com as seções: "Resumo Executivo", "Detalhes da Análise", e "Recomendações".
    O relatório deve ser em português.
    """

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini", # Modelo rápido e capaz de análise
            messages=[
                {"role": "system", "content": "Você é um analista geoespacial e de monitoramento de satélites altamente especializado. Seu objetivo é transformar dados técnicos em relatórios acionáveis."},
                {"role": "user", "content": context_prompt}
            ],
            temperature=0.7,
        )
        
        # Retorna o texto gerado pelo GPT
        return {
            "analysis_success": True,
            "ai_report_text": response.choices[0].message.content,
            "raw_data_used": {"dem": dem_data, "sar": sar_data, "ndvi": ndvi_data}
        }

    except Exception as e:
        return {
            "analysis_success": False,
            "error_message": f"Erro na chamada da API da OpenAI. Verifique sua chave API no arquivo .env. Erro: {e}",
        }