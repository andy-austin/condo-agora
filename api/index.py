# Re-export the FastAPI app from apps/api for Vercel serverless functions
import sys
from pathlib import Path

# Add apps/ to the Python path so 'api' is importable as a package
# This enables relative imports within apps/api/
sys.path.insert(0, str(Path(__file__).parent.parent / "apps"))

from api.index import app

# Vercel expects 'app' or 'handler' to be exported
handler = app
