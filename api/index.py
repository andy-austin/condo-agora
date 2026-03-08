# Re-export the FastAPI app from apps/api for Vercel serverless functions
import importlib.util
import sys
import types
from pathlib import Path

root = Path(__file__).parent.parent
apps_api = root / "apps" / "api"

# Add apps/ to sys.path for transitive imports
sys.path.insert(0, str(root / "apps"))

# Register apps/api as the 'api' package so relative imports work
api_pkg = types.ModuleType("api")
api_pkg.__path__ = [str(apps_api)]
api_pkg.__package__ = "api"
api_pkg.__file__ = str(apps_api / "__init__.py")
sys.modules["api"] = api_pkg

# Also clear any cached 'api.index' that points to this file
sys.modules.pop("api.index", None)

# Load apps/api/index.py directly via importlib
spec = importlib.util.spec_from_file_location(
    "api.index",
    str(apps_api / "index.py"),
    submodule_search_locations=[],
)
_mod = importlib.util.module_from_spec(spec)
sys.modules["api.index"] = _mod
spec.loader.exec_module(_mod)

app = _mod.app
handler = app
