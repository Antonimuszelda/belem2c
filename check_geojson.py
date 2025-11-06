import json

with open('backend/data/FCUs_BR.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
    print(f"Type: {data.get('type')}")
    print(f"Features: {len(data.get('features', []))}")
    if data.get('features'):
        print(f"First feature sample:")
        print(json.dumps(data['features'][0], indent=2)[:500])
