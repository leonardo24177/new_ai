-- Audit log: tracciamento azioni utenti/admin
CREATE TABLE IF NOT EXISTS audit_logs (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid,
  user_email  text,
  action      text        NOT NULL,
  metadata    jsonb       DEFAULT '{}',
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_user_id_idx    ON audit_logs (user_id);
CREATE INDEX IF NOT EXISTS audit_logs_action_idx     ON audit_logs (action);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs (created_at DESC);

-- Solo service_role può leggere/scrivere
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "no_user_access" ON audit_logs;
CREATE POLICY "no_user_access" ON audit_logs
  FOR ALL USING (false);
