import requests
import json

url = "http://localhost:8000/api/geojson/render_layer"

# Teste com polígono próximo ao Brasil
payload = {
    "filename": "FCUs_BR.json",
    "polygon": [
        {"lat": -15.0, "lng": -48.0},
        {"lat": -16.0, "lng": -48.0},
        {"lat": -16.0, "lng": -47.0},
        {"lat": -15.0, "lng": -47.0}
    ]
}

print("🔍 Testando endpoint:", url)
print("📦 Payload:")
print(json.dumps(payload, indent=2))
print("\n" + "="*50)

try:
    response = requests.post(url, json=payload, timeout=30)
    print(f"\n✅ Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"📊 Features encontradas: {len(data.get('features', []))}")
        if data.get('features'):
            print(f"\n🎯 Primeira feature:")
            print(json.dumps(data['features'][0], indent=2)[:300] + "...")
    else:
        print(f"❌ Erro: {response.status_code}")
        print(f"Resposta: {response.text}")
        
except Exception as e:
    print(f"❌ Erro na requisição: {e}")
    import traceback
    traceback.print_exc()
