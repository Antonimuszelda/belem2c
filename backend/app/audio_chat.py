"""backend/app/audio_chat.py

Helpers leves para chat por áudio/texto: dialetização paraense e fallback de resposta.

Esta implementação é intencionalmente leve: não baixa modelos nem usa dependências
pesadas. Ela permite que o backend entregue respostas com "sotaque" paraense e
seja compatível com deploys grátis como Railway (STT/TTS no cliente).
"""
from typing import Optional
import random


def dialectize_paraense(text: str) -> str:
    """Aplica transformações leves para dar um tom paraense descontraído.

    Regras simples (heurísticas):
    - Insere interjeções como 'égua' em frases informais.
    - Simplifica contrações e corta formalidades para um tom mais próximo.
    - Mantém o texto compreensível; evita alteração de números/dados.
    """
    if not text:
        return text

    # Normalizar espaços
    t = ' '.join(text.split())

    # Inserir 'égua' ocasionalmente após pontos ou no começo se a frase for curta
    if len(t) < 60 and random.random() < 0.6:
        t = f"Égua, {t}"
    elif random.random() < 0.25:
        # inserir no meio
        parts = t.split(',')
        if len(parts) > 1:
            idx = max(1, len(parts)//2)
            parts.insert(idx, ' égua')
            t = ','.join(parts)

    # Substituições simples para deixar o tom mais coloquial
    subs = [
        ("você está", "ocê tá"),
        ("você é", "ocê é"),
        ("você", "ocê"),
        ("está", "tá"),
        ("estão", "tão"),
        ("para", "pra"),
        ("por favor", "por favor, viu"),
        ("obrigado", "brigado"),
        ("ok", "ôxi"),
    ]

    for a, b in subs:
        t = t.replace(a, b)

    # Tornar final mais amistoso
    if not t.endswith(('!', '.', '?')):
        t = t + '.'

    # Acrescentar saudação final ocasional
    if random.random() < 0.35:
        endings = ["Tô aqui, ó.", "Diz aí.", "Num se acanha não, egua."]
        t = t + ' ' + random.choice(endings)

    return t


def normalize_slang(text: str) -> str:
    """Normaliza gírias/abreviações comuns para formas mais compreensíveis pelo modelo.

    Exemplos: 'tlgd' -> 'tá ligado', 'mn' -> 'mano', 'dboa' -> 'de boa', 'blz' -> 'beleza'
    Essa normalização é leve e desenhada para melhorar a compreensão sem apagar
    o tom informal do usuário.
    """
    if not text:
        return text

    t = text
    # map de formas comuns (case-insensitive)
    replacements = {
        "tlgd": "tá ligado",
        "tlgd": "tá ligado",
        "mn": "mano",
        "man": "mano",
        "dboa": "de boa",
        "d boa": "de boa",
        "blz": "beleza",
        "bão": "bom",
        "obg": "obrigado",
        "vlw": "valeu",
        "vc": "você",
        "num": "não",
        "né": "né",
    }

    # Substituir palavras inteiras (simples) respeitando limites de palavra
    words = t.split()
    for i, w in enumerate(words):
        lw = w.lower()
        if lw in replacements:
            words[i] = replacements[lw]

    return ' '.join(words)


def generate_fallback_response(user_message: str) -> str:
    """Gera uma resposta simples e descontraída caso o agente avançado não esteja disponível.

    Objetivo: prover algo funcional e divertido imediatamente (compatível com Railway).
    """
    base_replies = [
        "Pois não, amigão, conta aí o que tu quer saber que eu te ajudo.",
        "Óia só, vou dar uma olhada nisso pra ti.",
        "Egua! Isso parece interessante — me diz mais um pouco.",
        "Deixa comigo, vou te explicar de maneira simples e rapidinha.",
    ]

    # Se for pergunta simples, responder diretamente com um tom de explicação breve
    q_words = ['quando', 'onde', 'como', 'por que', 'quanto', 'qual', 'quem']
    lower = (user_message or '').lower()
    if any(w in lower for w in q_words):
        reply = random.choice(base_replies)
        reply = f"{reply} {'Respondendo:' if random.random()<0.5 else 'Aqui vai:'} {user_message}"
    else:
        reply = random.choice(base_replies)

    # Dialetizar antes de retornar para consistência
    return dialectize_paraense(reply)


def try_agent_chat(agent: Optional[object], message: str) -> str:
    """Tenta usar o agente Sacy (se fornecido). Se não disponível, usa fallback.

    O agente deve expor método `chat(message: str) -> str`.
    """
    try:
        if agent:
            # Alguns agentes podem ter método chat que aceita outros parâmetros; aqui
            # tentamos chamar apenas com a mensagem
            if hasattr(agent, 'chat'):
                return agent.chat(message)
            elif hasattr(agent, 'chat_with_context'):
                return agent.chat_with_context(message)
    except Exception:
        # Não falhar o servidor por conta do agente; cair para fallback
        pass

    return generate_fallback_response(message)
