-- ============================================================
-- ROW LEVEL SECURITY — assistente-ai.it
-- Esegui nel SQL Editor di Supabase (Dashboard → SQL Editor)
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
-- Ogni utente legge e scrive solo la propria riga
CREATE POLICY "user_configs: lettura propria" ON user_configs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_configs: scrittura propria" ON user_configs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_configs: aggiornamento proprio" ON user_configs
  FOR UPDATE USING (auth.uid() = user_id);

-- ─── user_ambiti ─────────────────────────────────────────────
CREATE POLICY "user_ambiti: lettura propria" ON user_ambiti
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_ambiti: inserimento proprio" ON user_ambiti
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_ambiti: aggiornamento proprio" ON user_ambiti
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "user_ambiti: eliminazione propria" ON user_ambiti
  FOR DELETE USING (auth.uid() = user_id);

-- ─── conversations ────────────────────────────────────────────
CREATE POLICY "conversations: lettura propria" ON conversations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "conversations: inserimento proprio" ON conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "conversations: aggiornamento proprio" ON conversations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "conversations: eliminazione propria" ON conversations
  FOR DELETE USING (auth.uid() = user_id);

-- ─── messages ────────────────────────────────────────────────
-- I messaggi appartengono a conversazioni dell'utente
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
CREATE POLICY "user_files: lettura propria" ON user_files
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_files: inserimento proprio" ON user_files
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_files: aggiornamento proprio" ON user_files
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "user_files: eliminazione propria" ON user_files
  FOR DELETE USING (auth.uid() = user_id);

-- ─── skills ──────────────────────────────────────────────────
-- Lettura pubblica per le skill pubbliche; scrittura solo via service role
CREATE POLICY "skills: lettura pubblica" ON skills
  FOR SELECT USING (pubblica = true);

-- ─── admins ──────────────────────────────────────────────────
-- Solo la service role può leggere/scrivere (le route admin la usano direttamente)
-- Nessuna policy per utenti autenticati normali → accesso negato di default

-- ─── STORAGE: bucket user-files ──────────────────────────────
-- Ogni utente accede solo alla propria cartella (path: {user_id}/...)
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
