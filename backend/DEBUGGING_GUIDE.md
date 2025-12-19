# Backend Startup Debugging Guide

## Files to Show Engineer

### Critical Files (Must Review)

1. **`backend/main.py`** - ASGI entrypoint
   - Line 9: `from app.api.v1 import api_router`
   - Line 20: `app = FastAPI(...)` - This is what uvicorn loads
   - Line 31: Router inclusion

2. **`backend/requirements.txt`** - Dependency list
   - Check all dependencies are installed
   - Verify versions are compatible

3. **`backend/app/core/config.py`** - Configuration (imported at startup)
   - Line 8: `from pydantic_settings import BaseSettings`
   - Line 115: `settings = Settings()` - Global instance created at import time

4. **`backend/app/core/logging.py`** - Logging setup (called in main.py line 17)
   - Line 6: Imports from `app.core.config`
   - Called before app creation

5. **`backend/app/api/v1/__init__.py`** - Router registration
   - Line 5: `from app.api.v1.routes import health`
   - Line 9: Router inclusion

6. **`backend/app/api/v1/routes/health.py`** - Health endpoint
   - Line 5: `from app.api.schemas import APIResponse`
   - Line 6: `from app.core.config import settings`

### Supporting Files (For Context)

7. **`backend/app/api/schemas.py`** - Response models
8. **`backend/app/core/exceptions.py`** - Exception classes
9. **`backend/app/core/middleware.py`** - Request logging middleware

## Directory Structure

```
backend/
├── main.py                    # ← ASGI entrypoint (uvicorn loads this)
├── requirements.txt           # ← Dependencies
├── app/
│   ├── __init__.py
│   ├── api/
│   │   ├── __init__.py
│   │   ├── schemas.py
│   │   └── v1/
│   │       ├── __init__.py    # ← Router registration
│   │       └── routes/
│   │           ├── __init__.py
│   │           └── health.py  # ← Health endpoint
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py          # ← Settings (imported early)
│   │   ├── exceptions.py
│   │   ├── logging.py         # ← Called in main.py
│   │   └── middleware.py
│   └── ...
```

## Import Chain (Critical Path)

When `python -m uvicorn main:app` runs:

1. **main.py** imports:
   - `from app.api.v1 import api_router` →
2. **app/api/v1/__init__.py** imports:
   - `from app.api.v1.routes import health` →
3. **app/api/v1/routes/health.py** imports:
   - `from app.core.config import settings` →
4. **app/core/config.py** imports:
   - `from pydantic_settings import BaseSettings` ← **Potential failure point**

## Key Information to Share

### Environment Details
- **Python version**: 3.13.2 (system Python)
- **Working directory**: Must be `backend/` directory
- **Command**: `python -m uvicorn main:app --reload`
- **Expected port**: 8000

### Current Status
- ✅ Dependencies installed (fastapi, uvicorn, pydantic, pydantic-settings)
- ✅ `main.py` imports successfully when run from backend directory
- ❓ Server startup - needs verification

### Potential Issues to Check

1. **Missing pydantic-settings**: Already fixed, but verify installation
2. **Python path**: Must run from `backend/` directory
3. **Port conflict**: Check if port 8000 is already in use
4. **Import errors**: Check for circular imports or missing modules
5. **Virtual environment**: Verify correct Python interpreter is used

## Test Commands

```powershell
# 1. Verify Python and location
cd backend
python --version
Get-Location

# 2. Test import
python -c "import main; print('Import OK')"

# 3. Check dependencies
python -m pip list | Select-String -Pattern "fastapi|uvicorn|pydantic"

# 4. Try starting server
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000

# 5. In another terminal, test endpoint
curl http://127.0.0.1:8000/api/v1/health
```

## Expected Behavior

**Successful startup should show:**
```
INFO:     Will watch for changes in these directories: ['C:\\...\\backend']
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
2025-12-15 XX:XX:XX - portfoliolab - INFO - Logging configured
2025-12-15 XX:XX:XX - portfoliolab.main - INFO - Application startup complete
INFO:     Application startup complete.
INFO:     Uvicorn running on http://127.0.0.1:8000
```

