"""API v1 routes."""

from fastapi import APIRouter

# TEMPORARY: Diagnostic logging for route registration
from app.core.logging import get_logger
logger = get_logger(__name__)

# TEMPORARY: Log each router import attempt
try:
    logger.info("DIAGNOSTIC: Importing health router...")
    from app.api.v1.routes import health
    logger.info("DIAGNOSTIC: ✓ health router imported successfully")
except Exception as e:
    logger.error(f"DIAGNOSTIC: ✗ Failed to import health router: {e}", exc_info=True)
    raise

try:
    logger.info("DIAGNOSTIC: Importing _test router...")
    from app.api.v1.routes import _test
    logger.info("DIAGNOSTIC: ✓ _test router imported successfully")
except Exception as e:
    logger.error(f"DIAGNOSTIC: ✗ Failed to import _test router: {e}", exc_info=True)
    raise

try:
    logger.info("DIAGNOSTIC: Importing portfolio router...")
    from app.api.v1.routes import portfolio
    logger.info("DIAGNOSTIC: ✓ portfolio router imported successfully")
except Exception as e:
    logger.error(f"DIAGNOSTIC: ✗ Failed to import portfolio router: {e}", exc_info=True)
    raise

try:
    logger.info("DIAGNOSTIC: Importing factors router...")
    from app.api.v1.routes import factors
    logger.info("DIAGNOSTIC: ✓ factors router imported successfully")
except Exception as e:
    logger.error(f"DIAGNOSTIC: ✗ Failed to import factors router: {e}", exc_info=True)
    raise

try:
    logger.info("DIAGNOSTIC: Importing trades router...")
    from app.api.v1.routes import trades
    logger.info("DIAGNOSTIC: ✓ trades router imported successfully")
except Exception as e:
    logger.error(f"DIAGNOSTIC: ✗ Failed to import trades router: {e}", exc_info=True)
    raise

api_router = APIRouter()

# TEMPORARY: Log each router inclusion
logger.info("DIAGNOSTIC: Including health router...")
api_router.include_router(health.router, tags=["health"])
logger.info("DIAGNOSTIC: ✓ health router included")

logger.info("DIAGNOSTIC: Including _test router...")
api_router.include_router(_test.router, prefix="/_test", tags=["test"])
logger.info("DIAGNOSTIC: ✓ _test router included")

logger.info("DIAGNOSTIC: Including portfolio router...")
# TEMPORARY: Check routes on portfolio router before inclusion
portfolio_routes = [r for r in portfolio.router.routes if hasattr(r, "path")]
logger.info(f"DIAGNOSTIC: Portfolio router has {len(portfolio_routes)} route(s)")
for r in portfolio_routes:
    methods = getattr(r, "methods", set())
    logger.info(f"DIAGNOSTIC:   Portfolio route: {sorted(methods)} {r.path}")
api_router.include_router(portfolio.router, prefix="/portfolio", tags=["portfolio"])
logger.info("DIAGNOSTIC: ✓ portfolio router included")

logger.info("DIAGNOSTIC: Including factors router...")
# TEMPORARY: Check routes on factors router before inclusion
factors_routes = [r for r in factors.router.routes if hasattr(r, "path")]
logger.info(f"DIAGNOSTIC: Factors router has {len(factors_routes)} route(s)")
for r in factors_routes:
    methods = getattr(r, "methods", set())
    logger.info(f"DIAGNOSTIC:   Factors route: {sorted(methods)} {r.path}")
api_router.include_router(factors.router, prefix="/portfolio", tags=["portfolio"])
logger.info("DIAGNOSTIC: ✓ factors router included")

logger.info("DIAGNOSTIC: Including trades router...")
trades_routes = [r for r in trades.router.routes if hasattr(r, "path")]
logger.info(f"DIAGNOSTIC: Trades router has {len(trades_routes)} route(s)")
for r in trades_routes:
    methods = getattr(r, "methods", set())
    logger.info(f"DIAGNOSTIC:   Trades route: {sorted(methods)} {r.path}")
api_router.include_router(trades.router, prefix="/trades", tags=["trades"])
logger.info("DIAGNOSTIC: ✓ trades router included")

logger.info("DIAGNOSTIC: All routers included successfully")

# TEMPORARY: Final check of api_router routes
api_routes = [r for r in api_router.routes if hasattr(r, "path")]
logger.info(f"DIAGNOSTIC: api_router now has {len(api_routes)} total route(s)")
for r in api_routes:
    methods = getattr(r, "methods", set())
    path = getattr(r, "path", "N/A")
    logger.info(f"DIAGNOSTIC:   api_router route: {sorted(methods)} {path}")

