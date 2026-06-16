import urllib.request
import json

url = "https://api-test.ksef.mf.gov.pl/docs/v2/openapi.json"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req) as response:
        openapi = json.loads(response.read().decode('utf-8'))
    
    schemas = openapi.get("components", {}).get("schemas", {})
    print("AuthenticationContextIdentifierType:")
    print(json.dumps(schemas.get("AuthenticationContextIdentifierType"), indent=2))
except Exception as e:
    print("Error:", e)
