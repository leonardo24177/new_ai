import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { modelLabel } from '@/lib/model-pricing'

async function createServiceClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}

export async function GET() {
  try {
    const supabase = await createServiceClient()

    // Verifica admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

    const { data: admin } = await supabase
      .from('admins')
      .select('user_id')
      .eq('user_id', user.id)
      .single()

    if (!admin) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

    // Statistiche globali
    const { data: globalStats } = await supabase
      .from('messages')
      .select('modello, tokens_input, tokens_output, costo_stimato, created_at')
      .eq('ruolo', 'assistant')
      .not('modello', 'is', null)

    if (!globalStats) return NextResponse.json({ stats: [] })

    // Aggrega per modello
    const perModello: Record<string, {
      label: string
      count: number
      tokens_input: number
      tokens_output: number
      costo_totale: number
    }> = {}

    for (const msg of globalStats) {
      const m = msg.modello || 'sconosciuto'
      if (!perModello[m]) {
        perModello[m] = {
          label: modelLabel(m),
          count: 0,
          tokens_input: 0,
          tokens_output: 0,
          costo_totale: 0,
        }
      }
      perModello[m].count++
      perModello[m].tokens_input += msg.tokens_input || 0
      perModello[m].tokens_output += msg.tokens_output || 0
      perModello[m].costo_totale += Number(msg.costo_stimato) || 0
    }

    // Costo per utente
    const { data: conversations } = await supabase
      .from('conversations')
      .select('id, user_id')

    const convMap: Record<string, string> = {}
    for (const c of conversations || []) {
      convMap[c.id] = c.user_id
    }

    const perUtente: Record<string, {
      user_id: string
      messaggi: number
      costo_totale: number
      modelli: Record<string, number>
    }> = {}

    for (const msg of globalStats) {
      const convId = (msg as Record<string, unknown>).conversation_id as string
      const userId = convMap[convId]
      if (!userId) continue

      if (!perUtente[userId]) {
        perUtente[userId] = {
          user_id: userId,
          messaggi: 0,
          costo_totale: 0,
          modelli: {},
        }
      }
      perUtente[userId].messaggi++
      perUtente[userId].costo_totale += Number(msg.costo_stimato) || 0

      const m = modelLabel(msg.modello || '')
      perUtente[userId].modelli[m] = (perUtente[userId].modelli[m] || 0) + 1
    }

    // Ultimi 30 giorni per grafico
    const trenta = new Date()
    trenta.setDate(trenta.getDate() - 30)

    const perGiorno: Record<string, number> = {}
    for (const msg of globalStats) {
      const data = msg.created_at?.split('T')[0]
      if (!data) continue
      if (new Date(data) < trenta) continue
      perGiorno[data] = (perGiorno[data] || 0) + (Number(msg.costo_stimato) || 0)
    }

    const totale_messaggi = globalStats.length
    const totale_costo = globalStats.reduce((s, m) => s + (Number(m.costo_stimato) || 0), 0)
    const totale_tokens = globalStats.reduce((s, m) => s + (m.tokens_input || 0) + (m.tokens_output || 0), 0)

    return NextResponse.json({
      totale_messaggi,
      totale_costo,
      totale_tokens,
      per_modello: Object.entries(perModello).map(([model, data]) => ({ model, ...data })),
      per_utente: Object.values(perUtente).sort((a, b) => b.costo_totale - a.costo_totale),
      per_giorno: Object.entries(perGiorno)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([data, costo]) => ({ data, costo })),
    })

  } catch (error) {
    console.error('Errore admin/stats:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
