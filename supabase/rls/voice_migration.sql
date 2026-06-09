-- Aggiunge preferenza TTS alla configurazione utente
ALTER TABLE user_configs ADD COLUMN IF NOT EXISTS tts_enabled boolean DEFAULT false;
