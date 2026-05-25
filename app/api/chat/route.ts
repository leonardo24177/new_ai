import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    // 1. Verifica autenticazione
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
    }

    const { messages, skill_slug, conversation_id } = await req.json()

    // 2. Recupera system prompt base dell'utente
    const { data: config } = await supabase
      .from('user_configs')
      .select('system_prompt_base, nome_assistente')
      .eq('user_id', user.id)
      .single()

    let systemPrompt = config?.system_prompt_base || 'Sei un assistente utile e preciso.'

    // 3. Inietta extra_sys della skill attiva (se presente)
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

    // 4. Salva messaggio utente se c'è una conversazione attiva
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

    // 5. Chiama Claude
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2048,
      system: systemPrompt,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
    })

    const assistantMessage = response.content[0].type === 'text'
      ? response.content[0].text
      : ''

    // 6. Salva risposta assistente
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
