import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { MODELS } from '@/lib/model-pricing'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

// GET — lista conversazioni dell'utente
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

    const { data: conversations } = await supabase
      .from('conversations')
      .select('id, titolo, created_at, skill_slug')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    return NextResponse.json({ conversations: conversations || [] })
  } catch (error) {
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

// PATCH — aggiorna titolo conversazione
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

    const { conversation_id, primo_messaggio } = await req.json()

    // Genera titolo con Claude
    const response = await client.messages.create({
      model: MODELS.haiku,
      max_tokens: 50,
      messages: [{
        role: 'user',
        content: `Genera un titolo brevissimo (massimo 5 parole) per una conversazione che inizia con questo messaggio: "${primo_messaggio}". Rispondi SOLO con il titolo, senza virgolette.`
      }]
    })

    const titolo = response.content[0].type === 'text'
      ? response.content[0].text.trim()
      : 'Nuova conversazione'

    await supabase
      .from('conversations')
      .update({ titolo })
      .eq('id', conversation_id)
      .eq('user_id', user.id)

    return NextResponse.json({ titolo })
  } catch (error) {
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

// DELETE — elimina conversazione
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

    const { conversation_id } = await req.json()

    await supabase
      .from('conversations')
      .delete()
      .eq('id', conversation_id)
      .eq('user_id', user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
