-- ─── user_limits: tetto di costo mensile per utente ──────────
-- Eseguire nel SQL Editor di Supabase, poi rieseguire policies.sql.
-- Tabella separata da user_configs perché l'utente ha policy di UPDATE
-- sulla propria riga di user_configs e potrebbe alzarsi il limite da solo.
-- Qui c'è solo la policy di SELECT: la scrittura avviene esclusivamente
-- via service role o SQL Editor.

CREATE TABLE IF NOT EXISTS user_limits (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  limite_mensile numeric NOT NULL DEFAULT 5.00,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_limits: lettura propria" ON user_limits;
CREATE POLICY "user_limits: lettura propria" ON user_limits
  FOR SELECT USING (auth.uid() = user_id);

-- Nessuna policy INSERT/UPDATE/DELETE: scrittura solo via service role.

-- Alza il limite di annacurcio@ombrecorte.org a $10/mese
INSERT INTO user_limits (user_id, limite_mensile)
VALUES ('33933b93-8538-4b3a-bb60-95754d93bd32', 10.00)
ON CONFLICT (user_id) DO UPDATE SET limite_mensile = EXCLUDED.limite_mensile;
