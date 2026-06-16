import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { selectModel } from '@/lib/model-selector'
import { calcolaCosto, COSTO_MENSILE_DEFAULT } from '@/lib/model-pricing'
import { logAction } from '@/lib/audit'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

const REGOLA_FONTI = `
REGOLA ASSOLUTA — DA APPLICARE PRIMA DI OGNI RISPOSTA:
Prima di rispondere a qualsiasi domanda che richieda fatti specifici, norme, sentenze, numeri, date, articoli di legge o riferimenti precisi, verifica mentalmente se hai accesso reale e verificato a quella fonte.

Se NON hai accesso verificato alla fonte, DEVI iniziare la risposta IMMEDIATAMENTE con questo avviso, prima di qualsiasi altro contenuto:

⚠️ FONTE NON VERIFICATA: Le informazioni seguenti NON provengono dalle tue fonti attendibili. Potrebbero contenere errori o imprecisioni. Verifica sempre prima di utilizzarle in ambito professionale.

REGOLE VINCOLANTI:
- NON fornire mai riferimenti a sentenze specifiche, articoli, circolari o dati precisi senza l'avviso se non provengono da fonti verificate
- È OBBLIGATORIO dire "non ho accesso verificato a questa fonte" piuttosto che inventare o dedurre informazioni specifiche
- La conoscenza generale di diritto, medicina, contabilità ecc. NON equivale ad avere accesso verificato a una fonte specifica
- Se l'utente non ti ha fornito il testo di un documento, NON puoi descriverne i dettagli come se li conoscessi
- Preferisci sempre la trasparenza sull'incertezza alla completezza apparente
`.trim()

// Iniettata solo quando ci sono documenti nel contesto
const REGOLA_DOCUMENTI = `
ANALISI DEI DOCUMENTI CARICATI:
- Basa le risposte sul testo fornito: cita testualmente i passaggi rilevanti e, se il testo contiene marcatori [Pagina N], indica sempre il numero di pagina dei passaggi citati.
- Distingui chiaramente ciò che il documento dice da tue interpretazioni o conoscenze generali.
- Se un documento è segnalato come troncato, avvisa l'utente che l'analisi copre solo la parte disponibile.
- Se l'informazione richiesta non è presente nel testo fornito, dillo esplicitamente invece di dedurla o inventarla.
- Per dati critici (importi, date, nomi, clausole) riporta sempre la formulazione esatta del documento.
`.trim()

// Limite per file di profilo iniettato in chat (gli allegati chat espliciti passano interi)
const MAX_CHAR_FILE_PROFILO = 60000

interface DriveFolder {
  folder_id: string
  nome: string
  contesto: string
}

interface DriveFile {
  id: string
  name: string
  mimeType: string
  modifiedTime?: string
}

interface DriveFileContent {
  nome: string
  testo: string
}

async function searchDriveFolder(
  folderId: string,
  accessToken: string,
  maxFiles = 5
): Promise<DriveFile[]> {
  try {
    const query = encodeURIComponent(
      `'${folderId}' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'`
    )
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=modifiedTime desc&pageSize=${maxFiles}&fields=files(id,name,mimeType,modifiedTime)`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    if (!res.ok) return []
    const data = await res.json()
    return data.files || []
  } catch {
    return []
  }
}

async function readDriveFile(
  file: DriveFile,
  accessToken: string
): Promise<string> {
  try {
    let url: string
    if (file.mimeType === 'application/vnd.google-apps.document') {
      url = `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=text/plain`
    } else if (
      file.mimeType === 'text/plain' ||
      file.mimeType === 'text/markdown' ||
      file.mimeType === 'text/csv' ||
      file.mimeType === 'application/json' ||
      file.mimeType === 'text/html' ||
      file.mimeType === 'text/xml' ||
      file.mimeType === 'application/xml' ||
      file.mimeType.startsWith('text/')
    ) {
      url = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`
    } else {
      return ''
    }

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) return ''
    const text = await res.text()
    return text.slice(0, 8000)
  } catch {
    return ''
  }
}

async function getGoogleAccessToken(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<string | null> {
  try {
    const { data } = await supabase
      .from('user_configs')
      .select('google_drive_token, google_drive_token_expiry')
      .eq('user_id', userId)
      .single()

    if (!data?.google_drive_token) return null

    if (data.google_drive_token_expiry) {
      const expiresAt = new Date(data.google_drive_token_expiry).getTime()
      if (Date.now() > expiresAt - 5 * 60 * 1000) {
        return null
      }
    }

    return data.google_drive_token
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Non autenticato' }), { status: 401 })
    }

    // Il proxy blocca solo le pagine: il check approvazione va ripetuto sulle API
    if (user.app_metadata?.approvato !== true) {
      return new Response(JSON.stringify({ error: 'Account in attesa di approvazione' }), { status: 403 })
    }

    // Rate limiting: max 60 messaggi/ora per utente
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const primoDelMese = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

    const { data: userConvIds } = await supabase
      .from('conversations')
      .select('id')
      .eq('user_id', user.id)

    let modelloMax: string | null = null

    if (userConvIds && userConvIds.length > 0) {
      const ids = userConvIds.map((c: { id: string }) => c.id)

      const [{ count: msgCount }, { data: costoMese }, { data: limiteRow }] = await Promise.all([
        supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .in('conversation_id', ids)
          .eq('ruolo', 'user')
          .gte('created_at', oneHourAgo),
        supabase
          .from('messages')
          .select('costo_stimato')
          .in('conversation_id', ids)
          .gte('created_at', primoDelMese),
        supabase
          .from('user_limits')
          .select('limite_mensile, modello_max')
          .eq('user_id', user.id)
          .maybeSingle(),
      ])

      // +1 per contare anche il messaggio corrente non ancora salvato.
      // Race condition con richieste concorrenti è accettabile a questa scala;
      // per un fix completo servono Redis o un trigger Postgres atomico.
      if ((msgCount ?? 0) + 1 > 60) {
        return new Response(JSON.stringify({ error: 'Limite orario raggiunto. Riprova tra poco.' }), { status: 429 })
      }

      modelloMax = limiteRow?.modello_max || null
      const limiteMensile = Number(limiteRow?.limite_mensile) || COSTO_MENSILE_DEFAULT
      const totaleSpeso = (costoMese || []).reduce((sum: number, m: { costo_stimato: number | null }) => sum + (m.costo_stimato || 0), 0)
      if (totaleSpeso >= limiteMensile) {
        return new Response(JSON.stringify({ error: 'Limite mensile raggiunto. Contatta il supporto per aumentare il tuo piano.' }), { status: 429 })
      }
    }

    const {
      messages,
      skill_slug,
      conversation_id,
      file_contexts,
      active_skill_slugs,
      ambito_attivo,
      web_search_context,
    } = await req.json()

    // Whitelist: ambito_attivo viene interpolato in un filtro PostgREST (.or)
    const AMBITI_VALIDI = ['lavoro', 'studio', 'personale']
    const ambitoAttivo: string | null = AMBITI_VALIDI.includes(ambito_attivo) ? ambito_attivo : null

    // 1. Recupera system prompt base
    const { data: config } = await supabase
      .from('user_configs')
      .select('system_prompt_base, nome_assistente')
      .eq('user_id', user.id)
      .single()

    let systemPrompt = config?.system_prompt_base || 'Sei un assistente utile e preciso.'

    // 2. Recupera professione per il model selector
    const { data: ambitoLavoro } = await supabase
      .from('user_ambiti')
      .select('onboarding_data')
      .eq('user_id', user.id)
      .eq('ambito', 'lavoro')
      .single()

    const professione = ambitoLavoro?.onboarding_data?.professione || ''

    // 3. Inietta system prompt extra dell'ambito attivo
    if (ambitoAttivo) {
      const { data: ambitoData } = await supabase
        .from('user_ambiti')
        .select('system_prompt_extra')
        .eq('user_id', user.id)
        .eq('ambito', ambitoAttivo)
        .single()

      if (ambitoData?.system_prompt_extra) {
        systemPrompt = `${systemPrompt}\n\n---\n${ambitoData.system_prompt_extra}`
      }
    }

    // 4. Inietta skill singola (legacy)
    if (skill_slug) {
      const { data: skill } = await supabase
        .from('skills')
        .select('extra_sys')
        .eq('slug', skill_slug)
        .single()

      if (skill?.extra_sys) {
        systemPrompt = `${systemPrompt}\n\n---\n${skill.extra_sys}`
      }
    }

    // 5. Inietta skill multiple
    if (active_skill_slugs && active_skill_slugs.length > 0) {
      const { data: activeSkillsData } = await supabase
        .from('skills')
        .select('extra_sys')
        .in('slug', active_skill_slugs)

      if (activeSkillsData && activeSkillsData.length > 0) {
        const extraSys = activeSkillsData.map((s: { extra_sys: string }) => s.extra_sys).join('\n\n')
        systemPrompt = `${systemPrompt}\n\n---\n${extraSys}`
      }
    }

    // 6. Regola verifica fonti — sempre presente, non modificabile dall'utente
    systemPrompt = `${systemPrompt}\n\n---\n${REGOLA_FONTI}`

    // 7. File di profilo filtrati per ambito
    let profileFilesQuery = supabase
      .from('user_files')
      .select('nome, storage_path, ambito, testo_contenuto, tipo, url, mime_type')
      .eq('user_id', user.id)
      .eq('tipo_contesto', 'profile')

    if (ambitoAttivo) {
      profileFilesQuery = profileFilesQuery.or(`ambito.eq.${ambitoAttivo},ambito.is.null`)
    }

    const { data: profileFiles } = await profileFilesQuery

    // 7. Prepara messaggi con file context
    const messagesWithContext = [...messages]
    const fileTexts: string[] = []

    // Raccoglie blocchi immagine (max 5 totali tra profilo e chat)
    type ImageBlock = { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }
    const imageBlocks: ImageBlock[] = []

    const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    const MAX_IMAGE_BYTES = 4 * 1024 * 1024 // 4MB per immagine (base64 ~5.3MB → sotto limite API)

    async function fetchImageBlock(storagePath: string, mimeType: string): Promise<ImageBlock | null> {
      if (!SUPPORTED_IMAGE_TYPES.includes(mimeType)) return null
      try {
        const { data: blob } = await supabase.storage.from('user-files').download(storagePath)
        if (!blob) return null
        if (blob.size > MAX_IMAGE_BYTES) return null // scarta immagini troppo grandi
        const arrayBuffer = await blob.arrayBuffer()
        const base64 = Buffer.from(arrayBuffer).toString('base64')
        return { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64 } }
      } catch {
        return null
      }
    }

    if (profileFiles && profileFiles.length > 0) {
      // Separa immagini e file testuali
      const profileImages = profileFiles.filter(f => f.mime_type?.startsWith('image/') && f.storage_path)
      const profileTextFiles = profileFiles.filter(f => !f.mime_type?.startsWith('image/'))

      // Download immagini in parallelo (max 5)
      const imageResults = await Promise.all(
        profileImages.slice(0, 5).map(f => fetchImageBlock(f.storage_path, f.mime_type))
      )
      imageBlocks.push(...imageResults.filter((b): b is ImageBlock => b !== null))

      for (const f of profileTextFiles) {
        const ambitoTag = f.ambito ? ` [${f.ambito}]` : ''
        if (f.testo_contenuto && f.testo_contenuto.trim().length > 0) {
          const tipoLabel = f.tipo === 'link' ? 'Link' : 'File'
          // Avviso esplicito di troncamento: il modello deve sapere che il testo non è completo
          const troncato = f.testo_contenuto.length > MAX_CHAR_FILE_PROFILO
            ? `\n[…DOCUMENTO TRONCATO: mostrati i primi ${MAX_CHAR_FILE_PROFILO} caratteri su ${f.testo_contenuto.length}]`
            : ''
          fileTexts.push(`[${tipoLabel} verificato${ambitoTag}: ${f.nome}]\n${f.testo_contenuto.slice(0, MAX_CHAR_FILE_PROFILO)}${troncato}`)
        } else if (f.tipo === 'link' && f.url) {
          fileTexts.push(`[Link di riferimento${ambitoTag}: ${f.nome} — ${f.url}] (contenuto non scaricato)`)
        } else if (f.storage_path) {
          fileTexts.push(`[File di profilo${ambitoTag}: ${f.nome}] (contenuto non disponibile)`)
        }
      }
    }

    // ─── 7b. CARTELLE GOOGLE DRIVE ────────────────────────────
    const { data: userConfig } = await supabase
      .from('user_configs')
      .select('drive_folders')
      .eq('user_id', user.id)
      .single()

    const driveFolders: DriveFolder[] = userConfig?.drive_folders || []

    if (driveFolders.length > 0) {
      const accessToken = await getGoogleAccessToken(supabase, user.id)

      if (accessToken) {
        for (const folder of driveFolders) {
          const files = await searchDriveFolder(folder.folder_id, accessToken, 3)

          if (files.length === 0) continue

          const driveContents: DriveFileContent[] = []
          for (const file of files) {
            const testo = await readDriveFile(file, accessToken)
            if (testo.trim()) {
              driveContents.push({ nome: file.name, testo })
            }
          }

          if (driveContents.length > 0) {
            const header = `[Cartella Google Drive: "${folder.nome}" — ${folder.contesto}]`
            const body = driveContents
              .map(f => `\n  📄 ${f.nome}:\n${f.testo}`)
              .join('\n')
            fileTexts.push(`${header}${body}`)
          } else {
            const fileNames = files.map(f => `  • ${f.name}`).join('\n')
            fileTexts.push(
              `[Cartella Google Drive: "${folder.nome}" — ${folder.contesto}]\nFile disponibili (contenuto non leggibile):\n${fileNames}`
            )
          }
        }
      }
    }
    // ─── fine Drive ───────────────────────────────────────────

    // Lunghezza del contesto profilo+Drive (gli allegati chat sono già in file_contexts)
    const lunghezzaContestoProfilo = fileTexts.reduce((sum, t) => sum + t.length, 0)

    if (file_contexts && file_contexts.length > 0) {
      const chatImages = file_contexts.filter((fc: { mime_type?: string; storage_path?: string }) => fc.mime_type?.startsWith('image/') && fc.storage_path)
      const chatTextFiles = file_contexts.filter((fc: { mime_type?: string; storage_path?: string }) => !fc.mime_type?.startsWith('image/'))

      const remainingSlots = 5 - imageBlocks.length
      if (remainingSlots > 0 && chatImages.length > 0) {
        const chatImageResults = await Promise.all(
          chatImages.slice(0, remainingSlots).map((fc: { storage_path: string; mime_type: string }) => fetchImageBlock(fc.storage_path, fc.mime_type))
        )
        imageBlocks.push(...chatImageResults.filter((b): b is ImageBlock => b !== null))
      }

      // Per i file senza testo lato client (estrazione fallita o troncata), ri-fetcha dal DB
      const idsDaFetchare = chatTextFiles
        .filter((fc: { id?: string; testo?: string }) => fc.id && !fc.testo)
        .map((fc: { id: string }) => fc.id)

      let testiDaDb: Record<string, string> = {}
      if (idsDaFetchare.length > 0) {
        const { data: dbFiles } = await supabase
          .from('user_files')
          .select('id, testo_contenuto')
          .in('id', idsDaFetchare)
          .eq('user_id', user.id)
        if (dbFiles) {
          testiDaDb = Object.fromEntries(dbFiles.map((f: { id: string; testo_contenuto: string | null }) => [f.id, f.testo_contenuto || '']))
        }
      }

      for (const fc of chatTextFiles) {
        const testo = fc.testo || (fc.id ? testiDaDb[fc.id] : '') || ''
        if (testo) {
          fileTexts.push(`[File allegato: ${fc.nome}]\n${testo}`)
        } else if (fc.nome) {
          fileTexts.push(`[File allegato: ${fc.nome}]`)
        }
      }
    }

    // Inietta risultati ricerca web (se l'utente ha premuto 🔍 prima di inviare)
    if (web_search_context?.results?.length > 0) {
      const fonti = (web_search_context.results as { title: string; url: string; description: string; raw_content?: string }[])
        .map((r, i) => {
          const corpo = r.raw_content || r.description
          return `${i + 1}. ${r.title}\n   ${r.url}\n   ${corpo}`
        })
        .join('\n\n')
      fileTexts.push(`[Risultati ricerca web — "${web_search_context.query}"]\n${fonti}\n[Cita l'URL quando rilevante nella risposta.]`)
      // Sblocca la REGOLA_FONTI per i risultati web: sono fonti verificate in tempo reale
      systemPrompt = `${systemPrompt}\n\n---\nNOTA RICERCA WEB: In questo messaggio hai accesso a risultati di ricerca Google reali e aggiornati (vedi [Risultati ricerca web] nel contesto). Trattali come fonti verificate: puoi citarne il contenuto direttamente senza l'avviso ⚠️ FONTE NON VERIFICATA. Se il testo completo di un documento è presente nel contesto, analizzalo e commentalo direttamente.`
    }

    // Regole di analisi documentale: solo quando c'è almeno un documento nel contesto
    if (fileTexts.length > 0) {
      systemPrompt = `${systemPrompt}\n\n---\n${REGOLA_DOCUMENTI}`
    }

    if ((fileTexts.length > 0 || imageBlocks.length > 0) && messagesWithContext.length > 0) {
      const lastIdx = messagesWithContext.length - 1
      const last = messagesWithContext[lastIdx]
      if (last.role === 'user') {
        const testoCompleto = fileTexts.length > 0
          ? `${fileTexts.join('\n\n')}\n\n---\n\n${last.content}`
          : last.content
        messagesWithContext[lastIdx] = {
          ...last,
          content: imageBlocks.length > 0
            ? [...imageBlocks, { type: 'text', text: testoCompleto }]
            : testoCompleto,
        }
      }
    }

    // 8. Selezione dinamica modello — considera anche i documenti di profilo/Drive
    // iniettati nel contesto, non solo gli allegati chat
    const lastUserMessage = messages[messages.length - 1]?.content || ''
    const { model, reason } = selectModel({
      userMessage: lastUserMessage,
      messages,
      fileContexts: file_contexts || [],
      activeSkillSlugs: active_skill_slugs || [],
      professione,
      extraContextLength: lunghezzaContestoProfilo,
      modeloCap: modelloMax,
    })

    // 9. Salva messaggio utente
    if (conversation_id) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage?.role === 'user') {
        const allegati = file_contexts && file_contexts.length > 0
          ? file_contexts.map((f: { nome: string; mime_type: string }) => ({ nome: f.nome, mime_type: f.mime_type }))
          : null
        await supabase.from('messages').insert({
          conversation_id,
          ruolo: 'user',
          contenuto: lastMessage.content,
          ...(allegati && { allegati }),
        })
      }
    }

    // 10. Streaming con SSE
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        let fullText = ''
        let inputTokens = 0
        let outputTokens = 0

        try {
          const anthropicStream = await client.messages.stream({
            model,
            max_tokens: 8192,
            system: systemPrompt,
            messages: messagesWithContext.map((m: { role: string; content: string | unknown[] }) => ({
              role: m.role as 'user' | 'assistant',
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              content: m.content as any,
            })),
          })

          for await (const event of anthropicStream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              const chunk = event.delta.text
              fullText += chunk
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`))
            }

            if (event.type === 'message_delta' && event.usage) {
              outputTokens = event.usage.output_tokens
            }

            if (event.type === 'message_start' && event.message.usage) {
              inputTokens = event.message.usage.input_tokens
            }
          }

          const costoStimato = calcolaCosto(model, inputTokens, outputTokens)

          if (conversation_id && fullText) {
            await supabase.from('messages').insert({
              conversation_id,
              ruolo: 'assistant',
              contenuto: fullText,
              modello: model,
              tokens_input: inputTokens,
              tokens_output: outputTokens,
              costo_stimato: costoStimato,
            })
            logAction(user.id, user.email || '', 'chat_message', {
              model, ambito: ambitoAttivo, conversation_id,
              tokens_input: inputTokens, tokens_output: outputTokens,
            }).catch(() => {})
          }

          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({
              done: true,
              model_used: model,
              tokens: { input: inputTokens, output: outputTokens },
              costo: costoStimato,
            })}\n\n`
          ))

        } catch (err) {
          console.error('Errore streaming:', err)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Errore durante lo streaming' })}\n\n`))
        } finally {
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

  } catch (error) {
    console.error('Errore chat:', error)
    return new Response(JSON.stringify({ error: 'Errore interno' }), { status: 500 })
  }
}
