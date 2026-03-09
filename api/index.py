# Re-export the FastAPI app from apps/api for Vercel serverless functions
import importlib.util
import sys
import types
from pathlib import Path

_root = Path(__file__).parent.parent
_apps_api = _root / "apps" / "api"

# Add apps/ to sys.path for transitive imports
sys.path.insert(0, str(_root / "apps"))

# Register apps/api as the 'api' package so relative imports work
_api_pkg = types.ModuleType("api")
_api_pkg.__path__ = [str(_apps_api)]
_api_pkg.__package__ = "api"
_api_pkg.__file__ = str(_apps_api / "__init__.py")
sys.modules["api"] = _api_pkg

# Clear any cached 'api.index' that points to this file
sys.modules.pop("api.index", None)

# Load apps/api/index.py directly via importlib
_spec = importlib.util.spec_from_file_location(
    "api.index",
    str(_apps_api / "index.py"),
    submodule_search_locations=[],
)
_mod = importlib.util.module_from_spec(_spec)
sys.modules["api.index"] = _mod
_spec.loader.exec_module(_mod)

app = _mod.app
