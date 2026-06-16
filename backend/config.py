"""Central configuration & environment loading. Imported first everywhere."""
import os
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from urllib.parse import quote_plus

def sanitize_mongo_url(url: str) -> str:
    if not url:
        return url
    # Strip whitespace and quotes
    url = url.strip().strip("'\"")
    try:
        # Detect prefix
        prefix = ""
        if url.startswith("mongodb+srv://"):
            prefix = "mongodb+srv://"
            rest = url[14:]
        elif url.startswith("mongodb://"):
            prefix = "mongodb://"
            rest = url[10:]
        else:
            return url
        
        # Split credentials from host using last @
        if "@" in rest:
            creds, host = rest.rsplit("@", 1)
            if ":" in creds:
                user, password = creds.split(":", 1)
                # Escape user and password
                escaped_user = quote_plus(user)
                escaped_password = quote_plus(password)
                return f"{prefix}{escaped_user}:{escaped_password}@{host}"
        return url
    except Exception:
        return url

MONGO_URL = sanitize_mongo_url(os.environ['MONGO_URL'])
DB_NAME = os.environ['DB_NAME'].strip().strip("'\"")

ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'admin@faktura.pl')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'Admin123!')

SESSION_TTL_DAYS = 7

# KSeF settings
KSEF_MODE = os.environ.get('KSEF_MODE', 'simulation')  # 'simulation' | 'real'
KSEF_ENV = os.environ.get('KSEF_ENV', 'test')           # 'test' | 'demo' | 'prod'
