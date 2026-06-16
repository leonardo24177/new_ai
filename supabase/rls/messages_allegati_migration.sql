-- Aggiunge colonna allegati (JSONB) alla tabella messages
-- Formato: [{ "nome": "documento.pdf", "mime_type": "application/pdf" }, ...]
-- Popolata solo per i messaggi utente che includono allegati chat

ALTER TABLE messages ADD COLUMN IF NOT EXISTS allegati jsonb;
