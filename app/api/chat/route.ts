import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { selectModel } from '@/lib/model-selector'
import { calcolaCosto } from '@/lib/model-pricing'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

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
      file.mimeType === 'text/csv'
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

    const {
      messages,
      skill_slug,
      conversation_id,
      file_contexts,
      active_skill_slugs,
      ambito_attivo,
      google_access_token,
    } = await req.json()

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
    if (ambito_attivo) {
      const { data: ambitoData } = await supabase
        .from('user_ambiti')
        .select('system_prompt_extra')
        .eq('user_id', user.id)
        .eq('ambito', ambito_attivo)
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

    // 6. File di profilo filtrati per ambito
    let profileFilesQuery = supabase
      .from('user_files')
      .select('nome, storage_path, ambito, testo_contenuto, tipo, url')
      .eq('user_id', user.id)
      .eq('tipo_contesto', 'profile')

    if (ambito_attivo) {
      profileFilesQuery = profileFilesQuery.or(`ambito.eq.${ambito_attivo},ambito.is.null`)
    }

    const { data: profileFiles } = await profileFilesQuery

    // 7. Prepara messaggi con file context
    const messagesWithContext = [...messages]
    const fileTexts: string[] = []

    if (profileFiles && profileFiles.length > 0) {
      for (const f of profileFiles) {
        const ambitoTag = f.ambito ? ` [${f.ambito}]` : ''
        if (f.testo_contenuto && f.testo_contenuto.trim().length > 0) {
          const tipoLabel = f.tipo === 'link' ? 'Link' : 'File'
          fileTexts.push(`[${tipoLabel} verificato${ambitoTag}: ${f.nome}]\n${f.testo_contenuto.slice(0, 30000)}`)
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

    console.log('[Drive] drive_folders:', driveFolders)
    console.log('[Drive] google_access_token dal client:', google_access_token ? 'presente' : 'assente')

    if (driveFolders.length > 0) {
      // Usa prima il token dal client (fresco), poi quello salvato in Supabase
      const accessToken = (google_access_token as string | null) || await getGoogleAccessToken(supabase, user.id)

      console.log('[Drive] accessToken finale:', accessToken ? 'presente' : 'assente')

      if (accessToken) {
        for (const folder of driveFolders) {
          const files = await searchDriveFolder(folder.folder_id, accessToken, 3)

          console.log(`[Drive] Cartella "${folder.nome}": ${files.length} file trovati`)

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

          console.log(`[Drive] Cartella "${folder.nome}": ${driveContents.length} file letti`)
        }
      } else {
        console.warn('[Drive] Access token Google non disponibile per user:', user.id)
      }
    }
    // ─── fine Drive ───────────────────────────────────────────

    if (file_contexts && file_contexts.length > 0) {
      for (const fc of file_contexts) {
        if (fc.testo) {
          fileTexts.push(`[File allegato: ${fc.nome}]\n${fc.testo}`)
        } else if (fc.nome) {
          fileTexts.push(`[File allegato: ${fc.nome}]`)
        }
      }
    }

    if (fileTexts.length > 0 && messagesWithContext.length > 0) {
      const lastIdx = messagesWithContext.length - 1
      const last = messagesWithContext[lastIdx]
      if (last.role === 'user') {
        messagesWithContext[lastIdx] = {
          ...last,
          content: `${fileTexts.join('\n\n')}\n\n---\n\n${last.content}`,
        }
      }
    }

    // 8. Selezione dinamica modello
    const lastUserMessage = messages[messages.length - 1]?.content || ''
    const { model, reason } = selectModel({
      userMessage: lastUserMessage,
      messages,
      fileContexts: file_contexts || [],
      activeSkillSlugs: active_skill_slugs || [],
      professione,
    })

    console.log(`[Model Selector] ${reason}`)

    // 9. Salva messaggio utente
    if (conversation_id) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage?.role === 'user') {
        await supabase.from('messages').insert({
          conversation_id,
          ruolo: 'user',
          contenuto: lastMessage.content,
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
            max_tokens: model === 'claude-opus-4-5' ? 4096 : 2048,
            system: systemPrompt,
            messages: messagesWithContext.map((m: { role: string; content: string }) => ({
              role: m.role as 'user' | 'assistant',
              content: m.content,
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
