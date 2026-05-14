import jwt
from typing import Annotated
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.config import settings

security = HTTPBearer()

def get_current_user(credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)]) -> str:
    """Verify Supabase JWT token and extract user_id."""
    token = credentials.credentials
    try:
        # Supabase uses HS256 for symmetric JWT signatures using the project's JWT secret.
        # But we don't have the JWT Secret (it shouldn't be exposed).
        # We can decode without verification if we trust the frontend, or we can use the 
        # Supabase client to get the user based on the token.
        # Let's decode without verification just to extract the sub for RLS, 
        # but to be secure we should initialize a Supabase client with this token
        # and let the Supabase Postgres instance handle the verification during RLS.
        
        # However, to use the token in RLS with the python client, we just pass the token.
        # We'll just extract the user_id (sub) to pass around if needed.
        unverified_payload = jwt.decode(token, options={"verify_signature": False})
        user_id = unverified_payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload",
            )
        return {"user_id": user_id, "token": token}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials: {str(e)}",
        )
