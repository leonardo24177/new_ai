import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { modelLabel } from '@/lib/model-pricing'

export async function GET() {
  try {
    // Il client SSR serve solo a identificare il chiamante: le query usano
    // un client service role puro, altrimenti viaggiano col JWT dell'admin
    // e la RLS mostra solo i suoi dati.
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

    const service = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: admin } = await service
      .from('admins')
      .select('user_id')
      .eq('user_id', user.id)
      .single()

    if (!admin) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

    // Statistiche globali — conversation_id aggiunto per collegare i messaggi agli utenti.
    // Supabase tronca ogni select a 1000 righe: si pagina con .range() finché il batch è pieno.
    const PAGE = 1000
    const globalStats: {
      modello: string | null
      tokens_input: number | null
      tokens_output: number | null
      costo_stimato: number | string | null
      created_at: string | null
      conversation_id: string
    }[] = []
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await service
        .from('messages')
        .select('modello, tokens_input, tokens_output, costo_stimato, created_at, conversation_id')
        .eq('ruolo', 'assistant')
        .not('modello', 'is', null)
        .order('id')
        .range(from, from + PAGE - 1)
      if (error) throw error
      globalStats.push(...(data || []))
      if (!data || data.length < PAGE) break
    }

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

    // Costo per utente — anche qui si pagina oltre il limite di 1000 righe
    const convMap: Record<string, string> = {}
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await service
        .from('conversations')
        .select('id, user_id')
        .order('id')
        .range(from, from + PAGE - 1)
      if (error) throw error
      for (const c of data || []) {
        convMap[c.id] = c.user_id
      }
      if (!data || data.length < PAGE) break
    }

    const perUtente: Record<string, {
      user_id: string
      messaggi: number
      costo_totale: number
      modelli: Record<string, number>
    }> = {}

    for (const msg of globalStats) {
      const convId = msg.conversation_id as string
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
