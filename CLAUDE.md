@AGENTS.md

# assistente-ai.it — Contesto progetto

SaaS di chat AI personalizzabile per professionisti italiani. Ogni utente configura un assistente Claude adattato al proprio ambito (lavoro, studio, personale), professione, fonti e tono. Il prodotto è in fase di test su https://new-ai-jade.vercel.app.

## Stack

| Layer | Tecnologia |
|---|---|
| Framework | Next.js 16.2.6 — App Router, Server Components, middleware |
| UI | React 19 + Tailwind CSS 4 |
| Auth + DB + Storage | Supabase (Postgres + Auth + Storage bucket `user-files`) |
| AI | Anthropic Claude — selezione dinamica Haiku/Sonnet/Opus |
| File parsing | pdf-parse, mammoth (Word), xlsx (Excel) |
| Drive | Google Drive API v3 (OAuth2 + gapi.picker) |
| Deploy | Vercel |

## Model IDs correnti

```
claude-haiku-4-5-20251001   ← messaggi semplici (score < 25)
claude-sonnet-4-6           ← richieste strutturate (score 25–69)
claude-opus-4-8             ← analisi complesse, file multipli (score ≥ 70)
```

La logica di selezione è in `lib/model-selector.ts`. Il pricing in `lib/model-pricing.ts`.

## Struttura cartelle

```
app/
  api/
    chat/route.ts           ← POST streaming a Claude (route principale)
    conversations/route.ts  ← GET/PATCH/DELETE conversazioni
    upload/route.ts         ← POST file (PDF/Word/Excel/testo/codice, max 20MB)
    links/route.ts          ← POST link con scraping HTML
    onboarding/
      generate/route.ts     ← genera system prompt singolo ambito
      generate-multi/route.ts ← genera system prompt multi-ambito
    admin/
      users/route.ts        ← GET/DELETE utenti (richiede tabella admins)
      stats/route.ts        ← GET statistiche costi per modello/utente/giorno
  chat/page.tsx             ← MAIN APP — chat multiambito con streaming
  profile/page.tsx          ← gestione ambiti, file, Google Drive, system prompt
  admin/page.tsx            ← pannello admin (utenti, skill, stats costi)
  onboarding/page.tsx       ← setup guidato multi-step post-registrazione
  login/ register/ forgot-password/ reset-password/
components/
  DriveFolderPicker.tsx     ← Google Drive OAuth picker (browser-only)
  FileTree.tsx              ← visualizzazione file caricati
lib/
  supabase/client.ts        ← Supabase client (browser)
  supabase/server.ts        ← Supabase client (SSR, usa cookies)
  model-selector.ts         ← selezione modello per complessità
  model-pricing.ts          ← calcolo costi, label, colori modelli
  onboarding/config.ts      ← professioni, utilizzi, specializzazioni, fonti
middleware.ts               ← protegge /chat, /profile, /admin → redirect /login
```

## Schema DB Supabase

```
user_configs      user_id, nome_assistente, system_prompt_base,
                  drive_folders (jsonb), google_drive_token, google_drive_token_expiry

user_ambiti       user_id, ambito ('lavoro'|'studio'|'personale'),
                  onboarding_data (jsonb), system_prompt_extra

conversations     id, user_id, titolo, skill_slug, created_at

messages          id, conversation_id, ruolo ('user'|'assistant'),
                  contenuto, modello, tokens_input, tokens_output,
                  costo_stimato, created_at

user_files        id, user_id, nome, mime_type, dimensione,
                  tipo_contesto ('profile'|'chat'), ambito, storage_path,
                  testo_contenuto, tipo ('file'|'link'), url, created_at

skills            id, slug (unique), label, extra_sys, categoria,
                  pubblica, professione

admins            user_id  ← inserimento manuale per abilitare accesso admin
```

## Variabili d'ambiente richieste

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY       ← solo server, non esporre al client
ANTHROPIC_API_KEY               ← solo server
NEXT_PUBLIC_GOOGLE_CLIENT_ID    ← Google OAuth per Drive picker
```

## Convenzioni di codice

- **Supabase server**: usare sempre `createClient()` da `lib/supabase/server.ts` nelle API route; `lib/supabase/client.ts` solo nei Client Components.
- **Auth nelle API route**: verificare sempre con `supabase.auth.getUser()` — non fidarsi di parametri passati dal client per l'user ID.
- **Admin check**: le route admin usano `SUPABASE_SERVICE_ROLE_KEY` + verifica tabella `admins`. Non usare la chiave service role altrove.
- **Streaming chat**: la route `/api/chat` usa `ReadableStream` con SSE (`data: {...}\n\n`). Non toccare il formato senza aggiornare il consumer in `chat/page.tsx`.
- **System prompt**: la concatenazione è `base + ambito_extra + skill_extra`, separati da `\n\n---\n`. Non invertire l'ordine.
- **Rate limiting**: 60 messaggi/ora per utente, contati sulla tabella `messages` via join su `conversations.user_id`.
- **File**: il testo estratto viene troncato a 50.000 caratteri al momento dell'upload; in chat il contesto per file è troncato a 30.000.
- **Lingua**: tutta la UI, i messaggi di errore e i commenti sono in italiano.
- **Niente console.log** in produzione — usare solo `console.error` per errori reali.

## Cosa NON fare

- Non passare `user_id` come parametro dal client — recuperarlo sempre da `supabase.auth.getUser()`.
- Non aggiungere logica di auto-modifica del `system_prompt_base` a partire da messaggi chat (rimossa perché vulnerabile a prompt injection).
- Non usare la `SUPABASE_SERVICE_ROLE_KEY` in Client Components o in route non-admin.
- Non rimuovere il rate limiting da `/api/chat` senza aggiungere un'alternativa.
