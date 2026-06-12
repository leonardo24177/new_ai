-- ============================================================
-- ROW LEVEL SECURITY — assistente-ai.it
-- Esegui nel SQL Editor di Supabase (Dashboard → SQL Editor)
-- Idempotente: può essere rieseguito senza errori
-- ============================================================

-- ─── ABILITA RLS SU TUTTE LE TABELLE ────────────────────────
ALTER TABLE user_configs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ambiti       ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages          ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_files        ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills            ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins            ENABLE ROW LEVEL SECURITY;

-- ─── user_configs ────────────────────────────────────────────
DROP POLICY IF EXISTS "user_configs: lettura propria"      ON user_configs;
DROP POLICY IF EXISTS "user_configs: scrittura propria"    ON user_configs;
DROP POLICY IF EXISTS "user_configs: aggiornamento proprio" ON user_configs;

CREATE POLICY "user_configs: lettura propria" ON user_configs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_configs: scrittura propria" ON user_configs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_configs: aggiornamento proprio" ON user_configs
  FOR UPDATE USING (auth.uid() = user_id);

-- ─── user_ambiti ─────────────────────────────────────────────
DROP POLICY IF EXISTS "user_ambiti: lettura propria"      ON user_ambiti;
DROP POLICY IF EXISTS "user_ambiti: inserimento proprio"  ON user_ambiti;
DROP POLICY IF EXISTS "user_ambiti: aggiornamento proprio" ON user_ambiti;
DROP POLICY IF EXISTS "user_ambiti: eliminazione propria" ON user_ambiti;

CREATE POLICY "user_ambiti: lettura propria" ON user_ambiti
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_ambiti: inserimento proprio" ON user_ambiti
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_ambiti: aggiornamento proprio" ON user_ambiti
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "user_ambiti: eliminazione propria" ON user_ambiti
  FOR DELETE USING (auth.uid() = user_id);

-- ─── conversations ────────────────────────────────────────────
DROP POLICY IF EXISTS "conversations: lettura propria"      ON conversations;
DROP POLICY IF EXISTS "conversations: inserimento proprio"  ON conversations;
DROP POLICY IF EXISTS "conversations: aggiornamento proprio" ON conversations;
DROP POLICY IF EXISTS "conversations: eliminazione propria" ON conversations;

CREATE POLICY "conversations: lettura propria" ON conversations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "conversations: inserimento proprio" ON conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "conversations: aggiornamento proprio" ON conversations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "conversations: eliminazione propria" ON conversations
  FOR DELETE USING (auth.uid() = user_id);

-- ─── messages ────────────────────────────────────────────────
DROP POLICY IF EXISTS "messages: lettura propria"      ON messages;
DROP POLICY IF EXISTS "messages: inserimento proprio"  ON messages;
DROP POLICY IF EXISTS "messages: eliminazione propria" ON messages;

CREATE POLICY "messages: lettura propria" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
        AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "messages: inserimento proprio" ON messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
        AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "messages: eliminazione propria" ON messages
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
        AND conversations.user_id = auth.uid()
    )
  );

-- ─── user_files ──────────────────────────────────────────────
DROP POLICY IF EXISTS "user_files: lettura propria"      ON user_files;
DROP POLICY IF EXISTS "user_files: inserimento proprio"  ON user_files;
DROP POLICY IF EXISTS "user_files: aggiornamento proprio" ON user_files;
DROP POLICY IF EXISTS "user_files: eliminazione propria" ON user_files;

CREATE POLICY "user_files: lettura propria" ON user_files
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_files: inserimento proprio" ON user_files
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_files: aggiornamento proprio" ON user_files
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "user_files: eliminazione propria" ON user_files
  FOR DELETE USING (auth.uid() = user_id);

-- ─── skills ──────────────────────────────────────────────────
-- user_id NULL = skill globale/admin; valorizzato = skill personale
-- (richiede personal_skills_migration.sql)
DROP POLICY IF EXISTS "skills: lettura pubblica" ON skills;
DROP POLICY IF EXISTS "skills: lettura pubblica e proprie" ON skills;
DROP POLICY IF EXISTS "skills: inserimento proprie"  ON skills;
DROP POLICY IF EXISTS "skills: aggiornamento proprie" ON skills;
DROP POLICY IF EXISTS "skills: eliminazione proprie" ON skills;

CREATE POLICY "skills: lettura pubblica e proprie" ON skills
  FOR SELECT USING ((pubblica = true AND user_id IS NULL) OR auth.uid() = user_id);

CREATE POLICY "skills: inserimento proprie" ON skills
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "skills: aggiornamento proprie" ON skills
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "skills: eliminazione proprie" ON skills
  FOR DELETE USING (auth.uid() = user_id);

-- ─── admins ──────────────────────────────────────────────────
-- Nessuna policy per utenti normali: le route admin usano service_role che bypassa RLS

-- ─── conversation_shares ─────────────────────────────────────
DROP POLICY IF EXISTS "shares: lettura propria"      ON conversation_shares;
DROP POLICY IF EXISTS "shares: inserimento proprio"  ON conversation_shares;
DROP POLICY IF EXISTS "shares: aggiornamento proprio" ON conversation_shares;
DROP POLICY IF EXISTS "shares: eliminazione propria" ON conversation_shares;

ALTER TABLE conversation_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shares: lettura propria" ON conversation_shares
  FOR SELECT USING (auth.uid() = owner_user_id);

CREATE POLICY "shares: inserimento proprio" ON conversation_shares
  FOR INSERT WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "shares: aggiornamento proprio" ON conversation_shares
  FOR UPDATE USING (auth.uid() = owner_user_id);

CREATE POLICY "shares: eliminazione propria" ON conversation_shares
  FOR DELETE USING (auth.uid() = owner_user_id);

-- ─── STORAGE: bucket user-files ──────────────────────────────
DROP POLICY IF EXISTS "storage: upload proprio"    ON storage.objects;
DROP POLICY IF EXISTS "storage: lettura propria"   ON storage.objects;
DROP POLICY IF EXISTS "storage: eliminazione propria" ON storage.objects;

CREATE POLICY "storage: upload proprio" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'user-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "storage: lettura propria" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'user-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "storage: eliminazione propria" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'user-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
