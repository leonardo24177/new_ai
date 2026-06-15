-- ─── user_limits: aggiunge colonna modello_max ──────────────────
-- Eseguire nel SQL Editor di Supabase.
-- Limita il modello massimo usabile per utente (null = nessun cap).

ALTER TABLE user_limits
  ADD COLUMN IF NOT EXISTS modello_max text
  CHECK (modello_max IN ('haiku', 'sonnet', 'opus'));
