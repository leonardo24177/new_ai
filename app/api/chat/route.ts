import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { selectModel } from '@/lib/model-selector'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
    }

    const {
      messages,
      skill_slug,
      conversation_id,
      file_contexts,
      active_skill_slugs,
      ambito_attivo,  // nuovo: ambito selezionato dall'utente nella chat
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

    // 3. Se c'è un ambito attivo, inietta il system prompt extra di quell'ambito
    if (ambito_attivo) {
      const { data: ambitoData } = await supabase
        .from('user_ambiti')
        .select('system_prompt_extra, onboarding_data')
        .eq('user_id', user.id)
        .eq('ambito', ambito_attivo)
        .single()

      if (ambitoData?.system_prompt_extra) {
        systemPrompt = `${systemPrompt}\n\n---\n${ambitoData.system_prompt_extra}`
      }
    }

    // 4. Inietta extra_sys skill singola (legacy)
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

    // 5. Inietta extra_sys skill multiple attive
    if (active_skill_slugs && active_skill_slugs.length > 0) {
      const { data: activeSkillsData } = await supabase
        .from('skills')
        .select('extra_sys, label')
        .in('slug', active_skill_slugs)

      if (activeSkillsData && activeSkillsData.length > 0) {
        const extraSys = activeSkillsData.map(s => s.extra_sys).join('\n\n')
        systemPrompt = `${systemPrompt}\n\n---\n${extraSys}`
      }
    }

    // 6. Recupera file permanenti filtrati per ambito attivo
    let profileFilesQuery = supabase
      .from('user_files')
      .select('nome, storage_path, mime_type, ambito')
      .eq('user_id', user.id)
      .eq('tipo_contesto', 'profile')

    // Filtra per ambito: se c'è un ambito attivo, mostra solo i file di quell'ambito
    // o i file senza ambito (null = generici)
    if (ambito_attivo) {
      profileFilesQuery = profileFilesQuery.or(`ambito.eq.${ambito_attivo},ambito.is.null`)
    }

    const { data: profileFiles } = await profileFilesQuery

    // 7. Prepara messaggi con file context
    let messagesWithContext = [...messages]
    const fileTexts: string[] = []

    if (profileFiles && profileFiles.length > 0) {
      for (const f of profileFiles) {
        const ambitoTag = f.ambito ? ` [${f.ambito}]` : ''
        fileTexts.push(`[File di profilo${ambitoTag}: ${f.nome}]`)
      }
    }

    // File chat temporanei — filtrati per ambito se presente
    if (file_contexts && file_contexts.length > 0) {
      for (const fc of file_contexts) {
        // I file chat temporanei vengono sempre inclusi (l'utente li ha allegati esplicitamente)
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

    // 8. Selezione dinamica del modello
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

    // 10. Chiama Claude
    const response = await client.messages.create({
      model,
      max_tokens: model === 'claude-opus-4-5' ? 4096 : 2048,
      system: systemPrompt,
      messages: messagesWithContext.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    })

    const assistantMessage = response.content[0].type === 'text'
      ? response.content[0].text
      : ''

    // 11. Salva risposta
    if (conversation_id) {
      await supabase.from('messages').insert({
        conversation_id,
        ruolo: 'assistant',
        contenuto: assistantMessage,
      })
    }

    return NextResponse.json({
      message: assistantMessage,
      model_used: model,
    })

  } catch (error) {
    console.error('Errore chat:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
