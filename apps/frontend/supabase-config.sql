-- Add this table to your Supabase project via the SQL Editor.
-- It stores LLM configuration so it persists across Vercel cold starts.

CREATE TABLE IF NOT EXISTS public.config (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    config JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.config ENABLE ROW LEVEL SECURITY;

-- Users can only see/update their own config
CREATE POLICY "Users can manage their own config"
    ON public.config
    FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
