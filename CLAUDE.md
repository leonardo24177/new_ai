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
| File parsing | pdf-parse, mammoth (Word), xlsx (Excel/XLS), jszip (PPTX) |
| Drive | Google Drive API v3 (OAuth2 + gapi.picker) |
| Deploy | Vercel |

## Model IDs correnti

```
claude-haiku-4-5-20251001   ← messaggi semplici (score < 25)
claude-sonnet-4-6           ← richieste strutturate (score 25–69)
claude-opus-4-8             ← analisi complesse, file multipli (score ≥ 70)
```

La logica di selezione è in `lib/model-selector.ts` (un allegato chat garantisce minimo Sonnet; i documenti profilo/Drive iniettati nel contesto contano via `extraContextLength`). Il pricing in `lib/model-pricing.ts`.
I model ID sono esportati come costanti `MODELS.haiku/sonnet/opus` da `lib/model-pricing.ts` — usare sempre quelle, mai stringhe hardcoded.

## Struttura cartelle

```
app/
  api/
    chat/route.ts           ← POST streaming a Claude (route principale)
    conversations/route.ts  ← GET/PATCH/DELETE conversazioni
    upload/route.ts         ← POST file (PDF/DOCX/XLSX/XLS/PPTX/immagini/testo/codice, max 20MB)
    links/route.ts          ← POST link con scraping HTML
    email/
      welcome/route.ts      ← POST email di benvenuto via Resend (chiamata da register dopo signUp)
    onboarding/
      generate/route.ts     ← genera system prompt singolo ambito
      generate-multi/route.ts ← genera system prompt multi-ambito (richiede auth)
    admin/
      users/route.ts        ← GET/DELETE utenti (richiede tabella admins)
      stats/route.ts        ← GET statistiche costi per modello/utente/giorno
      files/route.ts        ← GET/DELETE file utenti (storage + record, audit admin_file_deleted)
      files/[id]/route.ts   ← GET contenuto file: testo estratto, URL firmato immagini, URL link
      files/[id]/download/route.ts ← GET redirect a URL firmato con Content-Disposition attachment (5 min)
      personal-skills/route.ts ← GET/DELETE skill personali utenti (audit admin_skill_deleted)
      conversations/[id]/route.ts ← GET conversazione + messaggi (viewer chat nel tab Audit)
    conversations/
      [id]/share/route.ts   ← GET/POST/DELETE link condivisione (richiede auth)
    conv/
      [token]/route.ts      ← GET/POST lettura conversazione condivisa (pubblico, usa service role)
  conv/[token]/page.tsx     ← pagina read-only pubblica conversazione condivisa
  chat/page.tsx             ← MAIN APP — chat multiambito con streaming
  profile/page.tsx          ← gestione ambiti, file, Google Drive, system prompt
  admin/page.tsx            ← pannello admin (utenti, skill, stats costi)
  onboarding/page.tsx       ← setup guidato multi-step post-registrazione
  come-funziona/page.tsx    ← guida utente pubblica (steps + FAQ), linkata da landing e footer
  login/ register/ forgot-password/ reset-password/
components/
  DriveFolderPicker.tsx     ← Google Drive OAuth picker (browser-only)
  FileTree.tsx              ← visualizzazione file caricati
  CookieBanner.tsx          ← banner GDPR cookie (localStorage 'cookie_consent'), incluso in layout.tsx
lib/
  supabase/client.ts        ← Supabase client (browser)
  supabase/server.ts        ← Supabase client (SSR, usa cookies)
  model-selector.ts         ← selezione modello per complessità
  model-pricing.ts          ← calcolo costi, label, colori modelli
  onboarding/config.ts      ← professioni, utilizzi, specializzazioni, fonti
proxy.ts                      ← protegge /chat, /profile, /admin → redirect /login
app/
  in-attesa/page.tsx          ← pagina attesa approvazione admin
  privacy/page.tsx            ← Privacy Policy GDPR
  termini/page.tsx            ← Termini di Servizio
  not-found.tsx               ← pagina 404
  global-error.tsx            ← error boundary React con Sentry.captureException
  sentry-example-page/        ← pagina test Sentry (404 in produzione, solo dev)
  api/
    account/
      delete/route.ts         ← DELETE account + tutti i dati utente (GDPR), batch da 100
    admin/
      users/route.ts          ← PATCH approva utente o cambia password (new_password)
instrumentation.ts            ← init Sentry server-side (caricato da Next.js automaticamente)
instrumentation.client.ts     ← init Sentry client-side (caricato da Next.js automaticamente)
sentry.client.config.ts       ← config Sentry client (usato da withSentryConfig nel build)
sentry.server.config.ts       ← config Sentry server
sentry.edge.config.ts         ← config Sentry edge runtime
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
                  pubblica, professione,
                  user_id (nullable, FK auth.users ON DELETE CASCADE)
                  ← user_id null = skill globale/admin; valorizzato = skill
                    personale creata dall'utente (vedi personal_skills_migration.sql)

admins            user_id  ← inserimento manuale per abilitare accesso admin

user_limits       user_id (PK, FK auth.users ON DELETE CASCADE),
                  limite_mensile (numeric, default 5.00),
                  modello_max (text, nullable, CHECK IN ('haiku','sonnet','opus')),
                  created_at
                  ← tetto costo mensile e cap modello per utente; solo policy SELECT,
                    scrittura via service role/SQL Editor (vedi user_limits_migration.sql,
                    modello_max_migration.sql)

conversation_shares  id, conversation_id (FK conversations ON DELETE CASCADE),
                     owner_user_id, share_token (unique), password_hash (scrypt salato
                     `scrypt$salt$hash`; legacy SHA-256 hex supportato in lettura, nullable),
                     expires_at (nullable = forever), created_at
```

## Approvazione utenti

- Gli utenti devono essere approvati da un admin prima di accedere a `/chat` e `/profile`.
- L'approvazione è salvata in `auth.users.app_metadata.approvato = true` (non `user_metadata` — quello è modificabile dal client).
- Il proxy legge `user.app_metadata?.approvato` e reindirizza su `/in-attesa` se non approvato.
- L'admin approva/revoca via `PATCH /api/admin/users` → `supabase.auth.admin.updateUserById(id, { app_metadata: { approvato } })`.
- `/admin`, `/onboarding`, `/in-attesa` sono sempre accessibili agli utenti autenticati (non bloccati dall'approval check).

## Middleware (proxy.ts)

- In Next.js 16 il file si chiama **`proxy.ts`** (non `middleware.ts`) e la funzione esportata si chiama **`proxy`** (non `middleware`). Rinominarla causerà errore "Proxy is missing expected function export name".
- Il matcher include `/in-attesa` per gestire il redirect degli utenti non approvati.

## Variabili d'ambiente richieste

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY       ← solo server, non esporre al client
ANTHROPIC_API_KEY               ← solo server
NEXT_PUBLIC_GOOGLE_CLIENT_ID    ← Google OAuth per Drive picker
RESEND_API_KEY                  ← API key Resend (Sending access), solo server
RESEND_FROM_EMAIL               ← email mittente verificata in Resend (es. noreply@dominio.com)
SENTRY_ORG                      ← nome organizzazione Sentry (leonardo-stancati)
SENTRY_PROJECT                  ← nome progetto Sentry (javascript-nextjs)
SENTRY_AUTH_TOKEN               ← token per upload source maps in build
```

## Convenzioni di codice

- **Supabase server**: usare sempre `createClient()` da `lib/supabase/server.ts` nelle API route; `lib/supabase/client.ts` solo nei Client Components.
- **Auth nelle API route**: verificare sempre con `supabase.auth.getUser()` — non fidarsi di parametri passati dal client per l'user ID.
- **Admin check**: le route admin usano `SUPABASE_SERVICE_ROLE_KEY` + verifica tabella `admins`. Non usare la chiave service role altrove.
- **Streaming chat**: la route `/api/chat` usa `ReadableStream` con SSE (`data: {...}\n\n`). Non toccare il formato senza aggiornare il consumer in `chat/page.tsx`.
- **System prompt**: la concatenazione è `base + ambito_extra + skill_extra + REGOLA_FONTI`, separati da `\n\n---\n`. Non invertire l'ordine. La `REGOLA_FONTI` è hardcoded nel chat route e iniettata per tutti gli utenti/ambiti — non dipende dall'onboarding.
- **Rate limiting**: 60 messaggi/ora per utente, contati sulla tabella `messages` via join su `conversations.user_id`. Il check usa `count + 1 > 60` per includere il messaggio corrente non ancora salvato. Race condition con richieste concorrenti accettabile a questa scala.
- **Rate limiting fuori dalla chat**: le altre route che chiamano Claude usano `superaLimiteOrario()` (`lib/rate-limit.ts`), che conta le azioni su `audit_logs` via service role: upload 30/ora (`file_upload`), onboarding 10/ora (`onboarding_generate`, loggata a inizio richiesta). `PATCH /api/conversations` non ha contatore ma verifica l'ownership della conversazione prima della chiamata e tronca `primo_messaggio` a 500 caratteri. `generate-multi` accetta max 3 ambiti per richiesta.
- **max_tokens**: 8192 per tutti i modelli (Haiku, Sonnet, Opus).
- **Limite costo mensile**: per utente, letto da `user_limits.limite_mensile` con fallback $5/mese (costante `COSTO_MENSILE_MAX` in `/api/chat/route.ts`). Calcolato in parallelo al rate limiting sommando `costo_stimato` dei messaggi dal primo del mese. Restituisce 429 con messaggio che invita a contattare il supporto. Il limite per utente si modifica dal tab Utenti dell'admin (bottone "Limite" → `PATCH /api/admin/users` con `limite_mensile`, upsert su `user_limits` via service role, audit action `limit_changed`). La tabella non ha policy di scrittura — l'utente non può modificarsi il limite (vedi `supabase/rls/user_limits_migration.sql`). Il default è `COSTO_MENSILE_DEFAULT` in `lib/model-pricing.ts`.
- **Cap modello per utente**: `user_limits.modello_max` (nullable, valori `'haiku'|'sonnet'|'opus'`) limita il modello massimo usabile da un utente. Letto da `/api/chat/route.ts` insieme a `limite_mensile` e passato a `selectModel()` come `modeloCap`. In `lib/model-selector.ts`, se il modello selezionato supera il cap, viene abbassato al massimo consentito (la nota `[cap utente: X]` appare nel `reason`). Si imposta dal tab Utenti dell'admin (bottone "Modello" → `PATCH /api/admin/users` con `modello_max`, audit action `model_cap_changed`). Eseguire `supabase/rls/modello_max_migration.sql` per aggiungere la colonna.
- **Admin tab File**: visualizzazione contenuto file (bottone "Visualizza" → lazy load via `GET /api/admin/files/[id]`; testo in `<pre>` scrollabile, immagini come anteprima inline, link come URL cliccabile) e download (bottone "Scarica" → redirect a URL firmato Supabase con `Content-Disposition: attachment`, scadenza 5 min). Filtri client-side: utente, tipo file (PDF/immagine/Word/Excel/PPTX/testo/link) e contesto (profilo/chat).
- **Cookie banner**: `CookieBanner.tsx` incluso in `layout.tsx`. Usa `localStorage.cookie_consent` per ricordare l'accettazione. Solo cookie tecnici — nessuna CMP complessa necessaria.
- **File upload — formati supportati**: PDF (con fallback OCR via Claude Haiku se testo < 100 char), DOCX, XLSX, XLS, PPTX (parsing XML via jszip), immagini (JPEG/PNG/GIF/WebP), testo, codice. Formati `.doc`, `.ppt` restituiscono errore esplicito che chiede di convertire.
- **File upload — OCR**: `pdf-parse` è alla v2 (classe `PDFParse` + `getText()`, non più funzione — non regredire alla vecchia API). Se il testo estratto è sotto la soglia `max(100, 80 × pagine)` (i PDF scansionati con intestazione digitale producono ~20 char/pagina), il PDF viene inviato a Claude Haiku come documento nativo in **streaming**: al timeout di 50s si conserva il testo parziale accumulato. La route ha `export const maxDuration = 60`.
- **File**: il testo estratto viene troncato a 150.000 caratteri all'upload (`MAX_TESTO_ESTRATTO`); in chat i file di profilo sono troncati a 60.000 (`MAX_CHAR_FILE_PROFILO`) con avviso esplicito `[…DOCUMENTO TRONCATO…]` nel contesto, gli allegati chat passano interi. I PDF multi-pagina hanno marcatori `[Pagina N]` (sia da pdf-parse che da OCR) per citazioni precise. Quando ci sono documenti nel contesto, il chat route inietta la `REGOLA_DOCUMENTI` (citazioni testuali con pagina, niente deduzioni, avviso se troncato) dopo la `REGOLA_FONTI`.
- **Immagini in chat**: passate a Claude come `image` blocks (non come testo). Download in parallelo con `Promise.all`. Limite: max 5 immagini totali (profilo + chat), max 4MB per immagine. Formati: JPEG, PNG, GIF, WebP. Immagini > 4MB vengono silenziosamente scartate.
- **Clipboard paste immagini**: `onPaste` sulla textarea — se il clipboard contiene un'immagine, la carica direttamente come allegato chat senza dialog.
- **Drag & drop file**: handler `onDragOver/onDrop` sul container principale della chat. Max 3 file per drop. Overlay visivo durante il drag. Toast errore include il nome del file specifico che ha fallito.
- **Lingua**: tutta la UI, i messaggi di errore e i commenti sono in italiano.
- **Niente console.log** in produzione — usare solo `console.error` per errori reali.
- **Skills per ambito**: in chat le skill visibili sono filtrate per `ambitoAttivo` — lavoro vede skill della propria professione + skill globali (`professione = null`); studio e personale vedono solo skill globali. Non mostrare tutte le skill indifferentemente dall'ambito.
- **Skill personali**: l'utente le crea dal tab "✦ Skill" del profilo o dal pulsante "+" in coda alle skill in chat (modal "Crea e attiva", che attiva subito la skill creata; modifica/eliminazione solo dal profilo). Max 10, label 40 char, istruzioni 8000 char — limiti client-side, la RLS garantisce solo l'ownership). Salvate in `skills` con `user_id` valorizzato, `pubblica = false`, `professione = null` (visibili in ogni ambito), slug random `personale-...` per rispettare il vincolo UNIQUE globale. La route `/api/chat` non distingue: risolve gli slug col JWT utente e la RLS (`(pubblica AND user_id IS NULL) OR auth.uid() = user_id`) impedisce di iniettare skill personali altrui. Il pannello admin filtra `user_id IS NULL` nella gestione globale; le skill personali si vedono/eliminano dalla sezione dedicata del tab Skill (via `/api/admin/personal-skills`), i file utenti dal tab File (via `/api/admin/files`, che rimuove anche l'oggetto storage). Le skill personali appaiono in cima al selettore in chat (prima di quelle globali).
- **Sentry**: inizializzato via `instrumentation.ts` (server) e `instrumentation.client.ts` (client) — questi file sono caricati automaticamente da Next.js. Non usare `tunnelRoute` in `withSentryConfig` (incompatibile con Turbopack). Il DSN è hardcoded nei file di istrumentazione perché le env var non sono disponibili in quel contesto con Turbopack.
- **RLS Supabase**: le policy sono in `supabase/rls/policies.sql` — script idempotente con `DROP POLICY IF EXISTS` prima di ogni `CREATE POLICY`. Eseguire nel SQL Editor di Supabase dopo ogni modifica allo schema.
- **Email transazionali**: Resend via SMTP configurato su Supabase Auth. Welcome email inviata da `/api/email/welcome` dopo la registrazione. Richiede `RESEND_API_KEY` e `RESEND_FROM_EMAIL`. La route non può richiedere auth (la signUp non crea sessione): verifica via service role che l'email appartenga a un utente registrato negli ultimi 15 minuti, prende il nome da `user_metadata` (mai dal body) e lo passa per `escapeHtml()`.
- **Approvazione sulle API**: il proxy blocca solo le pagine — le route API che costano denaro o fanno fetch esterni (`/api/chat`, `/api/upload`, `/api/links`, `PATCH /api/conversations`) ripetono il check `user.app_metadata?.approvato === true` e restituiscono 403 se non approvato. Le route di onboarding restano accessibili pre-approvazione (per design).
- **Anti-SSRF in `/api/links`**: gli URL sono validati con `validaUrlPubblico()` (solo http/https, DNS risolto, IP privati/loopback/link-local/metadata/CGNAT bloccati) e il fetch usa `fetchPubblico()` che segue i redirect manualmente ri-validando ogni hop (max 3). Non sostituire con un fetch diretto.
- **Favicon**: generata dinamicamente da `app/icon.tsx` via `ImageResponse` (Next.js App Router).
- **Google Drive token**: recuperato sempre server-side da `user_configs.google_drive_token` — mai passato dal client. Il controllo scadenza client-side in `chat/page.tsx` legge `user_configs` (non `session.provider_token` che è un token diverso). GIS implicit flow non emette refresh token — alla scadenza (~1h) l'utente deve riconnettere dal profilo.
- **Sharing conversazioni**: la tabella `conversation_shares` collega una conversazione a un `share_token` UUID. La route pubblica `/api/conv/[token]` usa la `service_role` key (non auth) per leggere i dati. La password è hashata con scrypt salato (`lib/share-password.ts`, formato `scrypt$salt$hash`); gli hash SHA-256 legacy restano verificabili in lettura. La route pubblica limita i tentativi password a 10 per token+IP ogni 5 minuti (mappa in memoria, per-istanza). La pagina `/conv/[token]` è fuori dal matcher di `proxy.ts` — accessibile senza login. La gestione share (GET/POST/DELETE) è in `/api/conversations/[id]/share` e richiede auth. Prima di usare, eseguire `supabase/rls/shares_migration.sql` nel SQL Editor, poi rieseguire `policies.sql`.
- **Micro-animazioni**: `message-appear` (slide-up CSS) su ogni bolla, typing indicator (tre puntini) quando `content === ''`, `active:scale-[0.88]` sul send button, hover lift sulle card landing. Classi CSS in `globals.css`.
- **Input sanitization onboarding**: `generate/route.ts` e `generate-multi/route.ts` sanitizzano tutti i campi utente con `san()` (strip newline + limit lunghezza) prima di interpolarli nel prompt. `generate-multi` richiede auth.

## Cosa NON fare

- Non passare `user_id` come parametro dal client — recuperarlo sempre da `supabase.auth.getUser()`.
- Non aggiungere logica di auto-modifica del `system_prompt_base` a partire da messaggi chat (rimossa perché vulnerabile a prompt injection).
- Non usare la `SUPABASE_SERVICE_ROLE_KEY` in Client Components o in route non-admin.
- Non rimuovere il rate limiting da `/api/chat` senza aggiungere un'alternativa.
- Non rinominare `proxy.ts` in `middleware.ts` — in Next.js 16 il nome è cambiato.
- Non salvare `approvato` in `user_metadata` — è modificabile dal client. Usare sempre `app_metadata` via service role.
- Non fare download immagini sequenziali in chat — usare sempre `Promise.all` per scaricarle in parallelo.
- Non aumentare il limite immagini oltre 4MB senza verificare i limiti dell'API Anthropic.
- Non rimuovere il timeout OCR (50s, con `maxDuration = 60` sulla route upload) — senza, i PDF grandi causano timeout Vercel 504.
- Non usare `.in()` con array non limitati nella delete account — usare batch da 100.
- Non passare `google_access_token` dal client al server — il token Drive viene sempre letto da `user_configs` server-side.
- Non hardcodare model ID — usare sempre `MODELS.haiku/sonnet/opus` da `lib/model-pricing.ts`.
- Non rimuovere `package-lock.json` dal repo — Vercel usa `npm ci` che richiede il lockfile per build deterministici.
- Non creare client "service role" con `createServerClient` di `@supabase/ssr` + cookie: se nei cookie c'è una sessione, le query Postgres usano il JWT dell'utente (la service role key resta solo nell'header `apikey`) e la RLS si applica. Per bypassare la RLS usare sempre `createClient` puro di `@supabase/supabase-js` con la service role key, senza cookie; il client SSR serve solo per `auth.getUser()`.
