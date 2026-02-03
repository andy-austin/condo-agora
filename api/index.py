# Re-export the FastAPI app from apps/api for Vercel serverless functions
import sys
from pathlib import Path

# Add apps/api to the Python path
sys.path.insert(0, str(Path(__file__).parent.parent / "apps" / "api"))

from index import app

# Vercel expects 'app' or 'handler' to be exported
handler = app
