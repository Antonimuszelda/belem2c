import requests
import json

# Test the render_layer endpoint
url = "http://localhost:8000/api/geojson/render_layer"

payload = {
    "filename": "FCUs_BR.json",
    "polygon": [
        {"lat": -9.5, "lng": -35.7},
        {"lat": -9.6, "lng": -35.7},
        {"lat": -9.6, "lng": -35.8},
        {"lat": -9.5, "lng": -35.8}
    ]
}

print("🔍 Testando endpoint:", url)
print("📦 Payload:", json.dumps(payload, indent=2))

try:
    response = requests.post(url, json=payload, timeout=10)
    print(f"\n✅ Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"📊 Features encontradas: {len(data.get('features', []))}")
        if data.get('features'):
            print(f"🎯 Primeira feature: {json.dumps(data['features'][0], indent=2)[:500]}...")
    else:
        print(f"❌ Erro: {response.text}")
        
except Exception as e:
    print(f"❌ Erro na requisição: {e}")
