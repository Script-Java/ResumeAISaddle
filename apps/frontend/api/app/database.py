"""Supabase database layer for persistent storage."""

import logging
import jwt
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from supabase import create_client, Client

from app.config import settings
from app.context import current_token

logger = logging.getLogger(__name__)


class Database:
    """Supabase wrapper for recro ai data."""

    @property
    def client(self) -> Client:
        """Lazy initialization of Supabase Client using the request context token."""
        if not settings.next_public_supabase_url or not settings.next_public_supabase_publishable_key:
            raise ValueError("Supabase credentials are not configured in environment variables.")
        
        pub_key = settings.next_public_supabase_publishable_key
        token = current_token.get()
        
        # supabase-py v2 strictly enforces that the key is a JWT via re.match.
        # Newer Vercel/Supabase keys (e.g. sb_publishable_) are not JWTs.
        # We temporarily monkeypatch re.match to bypass this check so the client
        # initializes correctly with the publishable key and natively handles headers.
        import re
        old_match = re.match
        
        def bypass_jwt_check(pattern, string, flags=0):
            if isinstance(string, str) and string.startswith("sb_publishable_"):
                return True
            return old_match(pattern, string, flags)
            
        re.match = bypass_jwt_check
        
        try:
            if token:
                # Validate the token before passing to Supabase — malformed or
                # unparseable tokens cause a 500 when Supabase rejects them.
                try:
                    jwt.decode(token, options={"verify_signature": False})
                except jwt.DecodeError:
                    logger.warning("Invalid auth token, falling back to anon access")
                    token = None

            if token:
                from supabase import ClientOptions
                return create_client(
                    settings.next_public_supabase_url,
                    pub_key,
                    options=ClientOptions(headers={"Authorization": f"Bearer {token}"})
                )
                
            return create_client(
                settings.next_public_supabase_url,
                pub_key,
            )
        finally:
            # Always restore the original re.match
            re.match = old_match

    @property
    def user_id(self) -> str | None:
        """Extract user_id from the current context token."""
        token = current_token.get()
        if not token:
            return None
        try:
            unverified_payload = jwt.decode(token, options={"verify_signature": False})
            return unverified_payload.get("sub")
        except jwt.DecodeError:
            logger.warning("Failed to decode auth token, treating as unauthenticated")
            return None

    def close(self) -> None:
        """Close database connection. (No-op for Supabase REST client)"""
        pass

    # Resume operations
    def create_resume(
        self,
        content: str,
        content_type: str = "md",
        filename: str | None = None,
        is_master: bool = False,
        parent_id: str | None = None,
        processed_data: dict[str, Any] | None = None,
        processing_status: str = "pending",
        cover_letter: str | None = None,
        outreach_message: str | None = None,
        title: str | None = None,
        original_markdown: str | None = None,
    ) -> dict[str, Any]:
        """Create a new resume entry."""
        resume_id = str(uuid4())
        now = datetime.now(timezone.utc).isoformat()

        doc: dict[str, Any] = {
            "resume_id": resume_id,
            "user_id": self.user_id,
            "content": content,
            "content_type": content_type,
            "filename": filename,
            "is_master": is_master,
            "parent_id": parent_id,
            "processed_data": processed_data,
            "processing_status": processing_status,
            "cover_letter": cover_letter,
            "outreach_message": outreach_message,
            "title": title,
            "created_at": now,
            "updated_at": now,
        }
        if original_markdown is not None:
            # doc["original_markdown"] = original_markdown
            pass
            
        result = self.client.table("resumes").insert(doc).execute()
        return result.data[0]

    async def create_resume_atomic_master(
        self,
        content: str,
        content_type: str = "md",
        filename: str | None = None,
        processed_data: dict[str, Any] | None = None,
        processing_status: str = "pending",
        cover_letter: str | None = None,
        outreach_message: str | None = None,
        original_markdown: str | None = None,
    ) -> dict[str, Any]:
        """Create a new resume with atomic master assignment."""
        current_master = self.get_master_resume()
        is_master = current_master is None

        if current_master and current_master.get("processing_status") in ("failed", "processing"):
            self.client.table("resumes").update({"is_master": False}).eq("resume_id", current_master["resume_id"]).execute()
            is_master = True

        return self.create_resume(
            content=content,
            content_type=content_type,
            filename=filename,
            is_master=is_master,
            processed_data=processed_data,
            processing_status=processing_status,
            cover_letter=cover_letter,
            outreach_message=outreach_message,
            original_markdown=original_markdown,
        )

    def get_resume(self, resume_id: str) -> dict[str, Any] | None:
        """Get resume by ID."""
        result = self.client.table("resumes").select("*").eq("resume_id", resume_id).execute()
        return result.data[0] if result.data else None

    def get_master_resume(self) -> dict[str, Any] | None:
        """Get the master resume if exists."""
        result = self.client.table("resumes").select("*").eq("is_master", True).execute()
        return result.data[0] if result.data else None

    def update_resume(self, resume_id: str, updates: dict[str, Any]) -> dict[str, Any]:
        """Update resume by ID."""
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        result = self.client.table("resumes").update(updates).eq("resume_id", resume_id).execute()
        
        if not result.data:
            raise ValueError(f"Resume not found: {resume_id}")

        return result.data[0]

    def delete_resume(self, resume_id: str) -> bool:
        """Delete resume by ID."""
        result = self.client.table("resumes").delete().eq("resume_id", resume_id).execute()
        return len(result.data) > 0

    def list_resumes(self) -> list[dict[str, Any]]:
        """List all resumes."""
        result = self.client.table("resumes").select("*").execute()
        return result.data

    def set_master_resume(self, resume_id: str) -> bool:
        """Set a resume as the master, unsetting any existing master."""
        target = self.get_resume(resume_id)
        if not target:
            logger.warning("Cannot set master: resume %s not found", resume_id)
            return False

        self.client.table("resumes").update({"is_master": False}).eq("is_master", True).execute()
        updated = self.client.table("resumes").update({"is_master": True}).eq("resume_id", resume_id).execute()
        return len(updated.data) > 0

    # Job operations
    def create_job(self, content: str, resume_id: str | None = None) -> dict[str, Any]:
        """Create a new job description entry."""
        job_id = str(uuid4())
        now = datetime.now(timezone.utc).isoformat()

        doc = {
            "job_id": job_id,
            "user_id": self.user_id,
            "content": content,
            "resume_id": resume_id,
            "created_at": now,
        }
        result = self.client.table("jobs").insert(doc).execute()
        return result.data[0]

    def get_job(self, job_id: str) -> dict[str, Any] | None:
        """Get job by ID."""
        result = self.client.table("jobs").select("*").eq("job_id", job_id).execute()
        return result.data[0] if result.data else None

    def update_job(self, job_id: str, updates: dict[str, Any]) -> dict[str, Any] | None:
        """Update a job by ID."""
        result = self.client.table("jobs").update(updates).eq("job_id", job_id).execute()
        return result.data[0] if result.data else None

    # Improvement operations
    def create_improvement(
        self,
        original_resume_id: str,
        tailored_resume_id: str,
        job_id: str,
        improvements: list[dict[str, Any]],
    ) -> dict[str, Any]:
        """Create an improvement result entry."""
        request_id = str(uuid4())
        now = datetime.now(timezone.utc).isoformat()

        doc = {
            "request_id": request_id,
            "user_id": self.user_id,
            "original_resume_id": original_resume_id,
            "tailored_resume_id": tailored_resume_id,
            "job_id": job_id,
            "improvements": improvements,
            "created_at": now,
        }
        result = self.client.table("improvements").insert(doc).execute()
        return result.data[0]

    def get_improvement_by_tailored_resume(
        self, tailored_resume_id: str
    ) -> dict[str, Any] | None:
        """Get improvement record by tailored resume ID."""
        result = self.client.table("improvements").select("*").eq("tailored_resume_id", tailored_resume_id).execute()
        return result.data[0] if result.data else None

    def list_jobs(self) -> list[dict[str, Any]]:
        """List all job descriptions."""
        result = self.client.table("jobs").select("*").execute()
        return result.data

    def list_improvements(self) -> list[dict[str, Any]]:
        """List all improvement records."""
        result = self.client.table("improvements").select("*").execute()
        return result.data

    # Config storage — persists LLM provider, model, and API key across
    # cold starts on Vercel (where /tmp is ephemeral). Requires a `config`
    # table in Supabase (see SETUP.md for DDL).
    def save_config(self, config_data: dict[str, Any]) -> bool:
        """Save LLM config to Supabase.

        Upserts a single row keyed by user_id. Returns True on success.
        """
        try:
            uid = self.user_id
            if not uid:
                logger.warning("save_config: no user_id — cannot persist")
                return False
            row = {"user_id": uid, "config": config_data, "updated_at": datetime.now(timezone.utc).isoformat()}
            self.client.table("config").upsert(row, on_conflict="user_id").execute()
            return True
        except Exception as e:
            logger.warning("save_config failed: %s", e)
            return False

    def load_config(self) -> dict[str, Any]:
        """Load LLM config from Supabase.

        Returns empty dict if no config found or table doesn't exist.
        """
        try:
            uid = self.user_id
            if not uid:
                return {}
            result = self.client.table("config").select("config").eq("user_id", uid).execute()
            if result.data:
                return result.data[0].get("config", {})
            return {}
        except Exception as e:
            logger.warning("load_config failed: %s", e)
            return {}

    def reset_database(self) -> None:
        """Delete all data from all tables."""
        # Supabase/PostgREST requires a filter for delete operations.
        # `not_.is_(col, "null")` returns every row where the column is NOT
        # NULL — which is all rows for primary-key columns.
        self.client.table("improvements").delete().not_.is_("request_id", "null").execute()
        self.client.table("jobs").delete().not_.is_("job_id", "null").execute()
        self.client.table("resumes").delete().not_.is_("resume_id", "null").execute()

    def get_stats(self) -> dict[str, Any]:
        """Get database statistics."""
        return {
            "total_resumes": len(self.list_resumes()),
            "total_jobs": len(self.list_jobs()),
            "total_improvements": len(self.list_improvements()),
            "has_master_resume": self.get_master_resume() is not None,
        }


# Global database instance
db = Database()
