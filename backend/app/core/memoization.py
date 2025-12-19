"""Within-request memoization for provider calls.

This module provides request-scoped memoization to prevent duplicate provider
calls within the same request. This is a soft cache that lives only for the
duration of a single request.

RATE DISCIPLINE: Prevents accidental abuse of upstream providers by ensuring
the same provider call within a request only executes once.

Uses contextvars to ensure thread-safety and request isolation.
"""

from __future__ import annotations

import contextvars
from typing import Any, Callable, Dict, Optional, TypeVar

from app.core.logging import get_logger

logger = get_logger(__name__)

# Context variable for request-scoped memoization cache
# This is automatically isolated per request via contextvars
_request_cache_var: contextvars.ContextVar[Optional[Dict[str, Any]]] = contextvars.ContextVar(
    "request_cache", default=None
)

T = TypeVar("T")


def get_request_cache() -> Dict[str, Any]:
    """
    Get or create the request-scoped memoization cache.
    
    Returns:
        Dictionary for caching request-scoped data
    """
    cache = _request_cache_var.get()
    if cache is None:
        cache = {}
        _request_cache_var.set(cache)
    return cache


def clear_request_cache() -> None:
    """Clear the request-scoped memoization cache."""
    _request_cache_var.set({})


def memoize_request(key: str) -> Callable[[Callable[..., T]], Callable[..., T]]:
    """
    Decorator for within-request memoization.
    
    RATE DISCIPLINE: Ensures the same provider call within a request only
    executes once, preventing accidental abuse of upstream providers.
    
    Args:
        key: Cache key (should be deterministic based on function arguments)
        
    Returns:
        Decorator function
        
    Example:
        @memoize_request("yahoo:AAPL:2023-01-01:2023-12-31")
        async def get_price_series(...):
            ...
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        async def wrapper(*args: Any, **kwargs: Any) -> T:
            cache = get_request_cache()
            
            # Check if result is already cached for this request
            if key in cache:
                logger.debug(
                    "Using memoized result (within-request cache hit)",
                    extra={"cache_key": key, "function": func.__name__},
                )
                return cache[key]
            
            # Execute function and cache result
            result = await func(*args, **kwargs)
            cache[key] = result
            
            logger.debug(
                "Cached result for within-request memoization",
                extra={"cache_key": key, "function": func.__name__},
            )
            
            return result
        
        return wrapper
    
    return decorator


def memoize_request_sync(key: str) -> Callable[[Callable[..., T]], Callable[..., T]]:
    """
    Decorator for within-request memoization (synchronous functions).
    
    RATE DISCIPLINE: Ensures the same provider call within a request only
    executes once, preventing accidental abuse of upstream providers.
    
    Args:
        key: Cache key (should be deterministic based on function arguments)
        
    Returns:
        Decorator function
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        def wrapper(*args: Any, **kwargs: Any) -> T:
            cache = get_request_cache()
            
            # Check if result is already cached for this request
            if key in cache:
                logger.debug(
                    "Using memoized result (within-request cache hit)",
                    extra={"cache_key": key, "function": func.__name__},
                )
                return cache[key]
            
            # Execute function and cache result
            result = func(*args, **kwargs)
            cache[key] = result
            
            logger.debug(
                "Cached result for within-request memoization",
                extra={"cache_key": key, "function": func.__name__},
            )
            
            return result
        
        return wrapper
    
    return decorator

