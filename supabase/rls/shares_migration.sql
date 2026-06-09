-- ============================================================
-- Migration: conversation_shares
-- Esegui nel SQL Editor di Supabase PRIMA di aggiornare policies.sql
-- Idempotente grazie a IF NOT EXISTS
-- ============================================================

CREATE TABLE IF NOT EXISTS conversation_shares (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  UUID        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  owner_user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  share_token      TEXT        UNIQUE NOT NULL,
  password_hash    TEXT,
  expires_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE conversation_shares ENABLE ROW LEVEL SECURITY;
