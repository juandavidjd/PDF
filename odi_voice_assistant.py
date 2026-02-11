"""
ODI Voice Assistant v17.1
Puerto: 7777
Integración: M6.2 Fitment Engine + ElevenLabs
"""
import os
import json
import requests
from flask import Flask, request, jsonify, send_file
from datetime import datetime
from io import BytesIO

# Importar memoria persistente
from persistent_memory import get_memory, log_event

app = Flask(__name__)

# =============================================================================
# CONFIGURACIÓN
# =============================================================================

SECURE_TOKEN = os.environ.get("ODI_SECURE_TOKEN", "odi_strong_password_2026")

# M6.2 Fitment Engine
M62_URL = os.environ.get("M62_FITMENT_URL", "http://odi-m62-fitment:8802/fitment/query")

# ElevenLabs
ELEVEN_API_KEY = os.environ.get("ELEVEN_API_KEY", "")
ELEVEN_VOICE_ID = os.environ.get("ELEVENLABS_VOICE_ID", "qpjUiwx7YUVAavnmh2sF")
ELEVEN_API_URL = f"https://api.elevenlabs.io/v1/text-to-speech/{ELEVEN_VOICE_ID}"

# =============================================================================
# FUNCIONES DE INTEGRACIÓN
# =============================================================================

def query_fitment(texto_consulta):
    """Consulta al M6.2 Fitment Engine"""
    try:
        response = requests.post(
            M62_URL,
            json={"q": texto_consulta},
            timeout=5
        )
        if response.status_code == 200:
            return response.json()
        else:
            print(f"[M6.2] Error: {response.status_code}")
            return None
    except Exception as e:
        print(f"[M6.2] Exception: {e}")
        return None


def generate_voice_elevenlabs(texto):
    """Genera audio con ElevenLabs"""
    if not ELEVEN_API_KEY:
        print("[ElevenLabs] No hay API key configurada")
        return None
    
    try:
        headers = {
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": ELEVEN_API_KEY
        }
        
        data = {
            "text": texto,
            "model_id": "eleven_multilingual_v2",
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.75,
                "style": 0.0,
                "use_speaker_boost": True
            }
        }
        
        response = requests.post(
            ELEVEN_API_URL,
            json=data,
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            return response.content  # bytes de audio MP3
        else:
            print(f"[ElevenLabs] Error: {response.status_code} - {response.text}")
            return None
            
    except Exception as e:
        print(f"[ElevenLabs] Exception: {e}")
        return None


def format_fitment_response(fitment_result):
    """Formatea la respuesta de M6.2 para voz natural"""
    if not fitment_result:
        return "No pude consultar el catálogo en este momento. ¿Podrías repetir tu consulta?"
    
    status = fitment_result.get("status", "error")
    
    if status == "not_found":
        return "No encontré ese producto en el catálogo. ¿Podrías darme más detalles como la marca o modelo de tu moto?"
    
    if status == "success":
        main = fitment_result.get("main_result", {})
        title = main.get("title", "el producto")
        price = main.get("price", 0)
        price_formatted = f"{price:,.0f}".replace(",", ".")
        compatibility = main.get("compatibility", "")
        results_count = fitment_result.get("results_count", 1)
        
        # Construir respuesta natural
        respuesta = f"Sí tenemos. {title} por {price_formatted} pesos."
        
        if compatibility:
            respuesta += f" Compatible con {compatibility}."
        
        if results_count > 1:
            respuesta += f" También tengo {results_count - 1} opciones más si te interesa."
        
        return respuesta
    
    return "Hubo un problema consultando el catálogo. Intenta de nuevo."


# =============================================================================
# ENDPOINTS
# =============================================================================

@app.route('/', methods=['GET'])
def health():
    return jsonify({
        "status": "ok",
        "service": "ODI Voice Assistant",
        "version": "17.1",
        "integrations": {
            "m62_fitment": M62_URL,
            "elevenlabs": "configured" if ELEVEN_API_KEY else "not_configured"
        },
        "timestamp": datetime.utcnow().isoformat()
    })


@app.route('/odi/voice-response', methods=['POST'])
def voice_response():
    """Endpoint principal de respuesta de voz"""
    data = request.get_json() or {}
    token = data.get("token", "")
    
    if token != SECURE_TOKEN:
        return jsonify({"error": "Token inválido"}), 401
    
    # Extraer campos
    intent = data.get("intent", "VENTA_DESCONOCIDA")
    modo = data.get("modo", "SUPERVISADO")
    producto = data.get("producto", "el producto")
    precio = data.get("precio_final", 0)
    odi_event_id = data.get("odi_event_id", "")
    mensaje_custom = data.get("mensaje_custom")
    user_id = data.get("user_id", "default_user")
    consulta_texto = data.get("consulta_texto", "")  # Texto original para M6.2
    
    # Registrar en memoria persistente
    outcome = "SUCCESS" if modo == "AUTOMATICO" else "SUPERVISED"
    log_event(user_id, intent, outcome)
    
    # Generar mensaje según intent
    if mensaje_custom:
        mensaje = mensaje_custom
        
    elif intent == "FITMENT_QUERY" and consulta_texto:
        # ===== INTEGRACIÓN M6.2 =====
        print(f"[FITMENT] Consultando: {consulta_texto}")
        fitment_result = query_fitment(consulta_texto)
        mensaje = format_fitment_response(fitment_result)
        
    elif modo == "AUTOMATICO" and intent == "VENTA_CONFIRMADA":
        precio_fmt = f"{precio:,.0f}".replace(",", ".")
        mensaje = f"Listo. Registré {producto} por {precio_fmt} pesos."
        
    elif intent == "FITMENT_QUERY":
        mensaje = f"Consulta registrada para {producto}."
        
    elif modo == "SUPERVISADO":
        mensaje = f"El {producto} pasó a supervisión por seguridad."
        
    else:
        mensaje = f"Operación registrada: {producto}."
    
    # Log
    print(f"[{datetime.now().isoformat()}] {intent} | {modo} | {mensaje[:50]}...")
    
    return jsonify({
        "status": "ok",
        "mensaje": mensaje,
        "odi_event_id": odi_event_id
    })


@app.route('/odi/speak', methods=['POST'])
def speak():
    """Endpoint para generar audio con ElevenLabs"""
    data = request.get_json() or {}
    token = data.get("token", "")
    
    if token != SECURE_TOKEN:
        return jsonify({"error": "Token inválido"}), 401
    
    texto = data.get("texto", "")
    if not texto:
        return jsonify({"error": "Se requiere el campo 'texto'"}), 400
    
    # Generar audio
    audio_bytes = generate_voice_elevenlabs(texto)
    
    if audio_bytes:
        return send_file(
            BytesIO(audio_bytes),
            mimetype="audio/mpeg",
            as_attachment=True,
            download_name="voice_response.mp3"
        )
    else:
        return jsonify({
            "status": "error",
            "mensaje": "No se pudo generar el audio",
            "texto_fallback": texto
        }), 500


@app.route('/odi/fitment-voice', methods=['POST'])
def fitment_voice():
    """
    Endpoint combinado: Consulta M6.2 + Genera voz
    Input: {"token": "...", "consulta": "tienen la vela pa la boxer?"}
    Output: Audio MP3 o JSON con texto fallback
    """
    data = request.get_json() or {}
    token = data.get("token", "")
    
    if token != SECURE_TOKEN:
        return jsonify({"error": "Token inválido"}), 401
    
    consulta = data.get("consulta", "")
    if not consulta:
        return jsonify({"error": "Se requiere el campo 'consulta'"}), 400
    
    user_id = data.get("user_id", "default_user")
    
    # 1. Consultar M6.2
    print(f"[FITMENT-VOICE] Consulta: {consulta}")
    fitment_result = query_fitment(consulta)
    
    # 2. Formatear respuesta
    mensaje = format_fitment_response(fitment_result)
    
    # 3. Registrar evento
    log_event(user_id, "FITMENT_QUERY", "SUCCESS" if fitment_result else "ERROR")
    
    # 4. Generar audio (si ElevenLabs está configurado)
    audio_bytes = generate_voice_elevenlabs(mensaje)
    
    if audio_bytes:
        print(f"[FITMENT-VOICE] Audio generado: {len(audio_bytes)} bytes")
        return send_file(
            BytesIO(audio_bytes),
            mimetype="audio/mpeg",
            as_attachment=True,
            download_name="fitment_response.mp3"
        )
    else:
        # Fallback: devolver texto
        print(f"[FITMENT-VOICE] Fallback a texto")
        return jsonify({
            "status": "ok",
            "mensaje": mensaje,
            "audio": False,
            "fitment_result": fitment_result
        })


@app.route('/odi/memory/<user_id>', methods=['GET'])
def get_user_memory(user_id):
    """Endpoint para consultar memoria de usuario."""
    mem = get_memory()
    if not mem.user_exists(user_id):
        return jsonify({"error": "Usuario no encontrado"}), 404
    return jsonify(mem.snapshot(user_id))


# =============================================================================
# MAIN
# =============================================================================

if __name__ == '__main__':
    print("=" * 50)
    print("ODI Voice Assistant v17.1")
    print("Integración: M6.2 Fitment + ElevenLabs")
    print(f"M6.2 URL: {M62_URL}")
    print(f"ElevenLabs: {'Configurado' if ELEVEN_API_KEY else 'No configurado'}")
    print("=" * 50)
    app.run(host='0.0.0.0', port=7777, debug=False)