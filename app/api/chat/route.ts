import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

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

    const { messages, skill_slug, conversation_id, file_contexts, active_skill_slugs } = await req.json()

    // 1. Recupera system prompt base
    const { data: config } = await supabase
      .from('user_configs')
      .select('system_prompt_base, nome_assistente')
      .eq('user_id', user.id)
      .single()

    let systemPrompt = config?.system_prompt_base || 'Sei un assistente utile e preciso.'

    // 2. Inietta extra_sys della skill singola (legacy)
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

    // 3. Inietta extra_sys delle skill multiple attive
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

    // 4. Inietta testo dei file di profilo (permanenti)
    const { data: profileFiles } = await supabase
      .from('user_files')
      .select('nome, storage_path, mime_type')
      .eq('user_id', user.id)
      .eq('tipo_contesto', 'profile')

    // 5. Prepara i messaggi con i file context
    let messagesWithContext = [...messages]
    const fileTexts: string[] = []

    if (profileFiles && profileFiles.length > 0) {
      for (const f of profileFiles) {
        if (f.storage_path) {
          fileTexts.push(`[File di profilo: ${f.nome}]`)
        }
      }
    }

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

    // 6. Salva messaggio utente
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

    // 7. Chiama Claude
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2048,
      system: systemPrompt,
      messages: messagesWithContext.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
    })

    const assistantMessage = response.content[0].type === 'text'
      ? response.content[0].text
      : ''

    // 8. Salva risposta
    if (conversation_id) {
      await supabase.from('messages').insert({
        conversation_id,
        ruolo: 'assistant',
        contenuto: assistantMessage,
      })
    }

    return NextResponse.json({ message: assistantMessage })

  } catch (error) {
    console.error('Errore chat:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}