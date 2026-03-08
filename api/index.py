# Re-export the FastAPI app from apps/api for Vercel serverless functions
import sys
import types
from pathlib import Path

root = Path(__file__).parent.parent

# Replace the 'api' module in sys.modules so that 'from api.xxx import ...'
# resolves to apps/api/ instead of this file (api/index.py)
api_pkg = types.ModuleType("api")
api_pkg.__path__ = [str(root / "apps" / "api")]
api_pkg.__package__ = "api"
sys.modules["api"] = api_pkg

# Add apps/ to sys.path for any transitive imports
sys.path.insert(0, str(root / "apps"))

from api.index import app  # noqa: E402 — now resolves to apps/api/index.py

# Vercel expects 'app' or 'handler' to be exported
handler = app
