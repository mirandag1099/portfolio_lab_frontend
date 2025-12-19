"""Request context management for request ID propagation.

This module provides context variables for propagating request-scoped data
throughout the application without explicitly passing it through every function call.
"""

import contextvars
import uuid
from typing import Optional

# Context variable for request ID
# This is set once per request in middleware and automatically propagated
# to all async tasks spawned during that request
request_id_var: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar(
    "request_id", default=None
)


def get_request_id() -> Optional[str]:
    """
    Get the current request ID from context.
    
    Returns:
        Request ID string if set, None otherwise
    """
    return request_id_var.get()


def set_request_id(request_id: Optional[str] = None) -> str:
    """
    Set the request ID in context.
    
    If no request_id is provided, generates a new UUID.
    
    Args:
        request_id: Optional request ID to set. If None, generates UUID.
        
    Returns:
        The request ID that was set
    """
    if request_id is None:
        request_id = str(uuid.uuid4())
    request_id_var.set(request_id)
    return request_id


def generate_request_id() -> str:
    """
    Generate a new unique request ID.
    
    Returns:
        UUID string suitable for request tracking
    """
    return str(uuid.uuid4())

