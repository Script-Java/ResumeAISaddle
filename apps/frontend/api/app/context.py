"""Context variables for request-scoped data."""

from contextvars import ContextVar

# Stores the Supabase JWT token for the current request
current_token: ContextVar[str] = ContextVar("current_token", default="")
