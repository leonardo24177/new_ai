import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { superaLimiteOrario } from '@/lib/rate-limit'
import { logAction } from '@/lib/audit'

const MAX_RICERCHE_ORA = 20

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

    if (user.app_metadata?.approvato !== true) {
      return NextResponse.json({ error: 'Account non ancora approvato' }, { status: 403 })
    }

    const { query } = await req.json()
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json({ error: 'Query mancante' }, { status: 400 })
    }
    const q = query.trim().slice(0, 300)

    if (await superaLimiteOrario(user.id, 'web_search', MAX_RICERCHE_ORA)) {
      return NextResponse.json({ error: `Limite ricerche raggiunto (max ${MAX_RICERCHE_ORA}/ora). Riprova più tardi.` }, { status: 429 })
    }

    const apiKey = process.env.BRAVE_SEARCH_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Servizio di ricerca non configurato' }, { status: 503 })
    }

    const params = new URLSearchParams({ q, count: '5' })
    const url = `https://api.search.brave.com/res/v1/web/search?${params}`
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': apiKey,
      },
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error('Brave Search error:', res.status, body.slice(0, 500))
      const detail = body ? ` — ${body.slice(0, 120)}` : ''
      const msg =
        res.status === 401 ? 'API key non valida o non attivata (401)' :
        res.status === 403 ? 'Piano non autorizzato per web search (403)' :
        res.status === 422 ? `Query non valida (422)${detail}` :
        res.status === 429 ? 'Limite Brave Search raggiunto (429)' :
        `Errore Brave Search ${res.status}${detail}`
      return NextResponse.json({ error: msg }, { status: 502 })
    }

    const data = await res.json()
    const raw = data?.web?.results || []

    const results = raw.slice(0, 5).map((r: { title?: string; url?: string; description?: string }) => ({
      title: r.title || '',
      url: r.url || '',
      description: r.description || '',
    }))

    logAction(user.id, user.email || '', 'web_search', { query: q, risultati: results.length }).catch(() => {})

    return NextResponse.json({ query: q, results })
  } catch (error) {
    console.error('Errore /api/search:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
