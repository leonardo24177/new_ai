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

    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(q)}&count=5&search_lang=it&country=IT`
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': apiKey,
      },
    })

    if (!res.ok) {
      console.error('Brave Search error:', res.status)
      return NextResponse.json({ error: 'Errore nella ricerca. Riprova.' }, { status: 502 })
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
