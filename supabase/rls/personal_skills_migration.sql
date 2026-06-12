-- ─── skills personali: colonna user_id ───────────────────────
-- Eseguire nel SQL Editor di Supabase, poi rieseguire policies.sql.
-- user_id NULL  = skill globale/admin (comportamento attuale)
-- user_id pieno = skill personale, visibile e gestibile solo dal proprietario.
-- Le policy CRUD definitive sono in policies.sql; qui c'è solo lo schema.

ALTER TABLE skills
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS skills_user_id_idx ON skills(user_id);
