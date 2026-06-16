import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { superaLimiteOrario } from '@/lib/rate-limit'
import { logAction } from '@/lib/audit'

const MAX_RICERCHE_ORA = 20

// Domini autorevoli per professione — usati come filtro site: nella query Google (Serper)
const DOMINI_PER_PROFESSIONE: Record<string, string[]> = {
  commercialista: [
    'agenziaentrate.gov.it',
    'normattiva.it',
    'gazzettaufficiale.it',
    'fiscooggi.it',
    'ilsole24ore.com',
    'mef.gov.it',
    'cortedicassazione.it',
    'giustizia.it',
    'odcec.it',
  ],
  revisore_contabile: [
    'agenziaentrate.gov.it',
    'normattiva.it',
    'gazzettaufficiale.it',
    'mef.gov.it',
    'odcec.it',
    'revisionelegale.mef.gov.it',
  ],
  ingegnere: [
    'normattiva.it',
    'gazzettaufficiale.it',
    'mit.gov.it',
    'cni.it',
    'uni.com',
    'ingegneri.info',
    'edilportale.com',
    'acca.it',
    'cslp.it',
  ],
  architetto: [
    'normattiva.it',
    'gazzettaufficiale.it',
    'mit.gov.it',
    'cnappc.it',
    'edilportale.com',
    'acca.it',
  ],
  geometra: [
    'normattiva.it',
    'gazzettaufficiale.it',
    'mit.gov.it',
    'cng.it',
    'edilportale.com',
  ],
  avvocato: [], // ricerca aperta: le sentenze specifiche sono su siti non prevedibili
  notaio: [
    'normattiva.it',
    'gazzettaufficiale.it',
    'notariato.it',
    'giustizia.it',
    'cortedicassazione.it',
  ],
  medico: [
    'salute.gov.it',
    'aifa.gov.it',
    'iss.it',
    'epicentro.iss.it',
    'fnomceo.it',
    'nejm.org',
    'pubmed.ncbi.nlm.nih.gov',
  ],
  psicologo: [
    'salute.gov.it',
    'cnop.it',
    'iss.it',
    'pubmed.ncbi.nlm.nih.gov',
  ],
  insegnante: [
    'miur.gov.it',
    'istruzione.it',
    'normattiva.it',
    'gazzettaufficiale.it',
    'orizzontescuola.it',
    'tuttoscuola.com',
  ],
  professore_universitario: [
    'miur.gov.it',
    'normattiva.it',
    'gazzettaufficiale.it',
    'anvur.it',
    'unibocconi.it',
  ],
}

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

    const apiKey = process.env.SERPER_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Servizio di ricerca non configurato' }, { status: 503 })
    }

    // Leggi la professione per eventuale filtro domini
    const { data: ambitoLavoro } = await supabase
      .from('user_ambiti')
      .select('onboarding_data')
      .eq('user_id', user.id)
      .eq('ambito', 'lavoro')
      .single()

    const professione: string = ambitoLavoro?.onboarding_data?.professione || ''
    const domini = DOMINI_PER_PROFESSIONE[professione] || []

    // Con Serper (Google) il filtro domini si applica come operatori site: nella query
    let queryFinale = q
    if (domini.length > 0) {
      const siteFilter = domini.map(d => `site:${d}`).join(' OR ')
      queryFinale = `${q} (${siteFilter})`
    }

    const res = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ q: queryFinale, num: 5, gl: 'it', hl: 'it' }),
    })

    if (!res.ok) {
      const resBody = await res.text().catch(() => '')
      console.error('Serper Search error:', res.status, resBody.slice(0, 500))
      const msg =
        res.status === 401 ? 'API key Serper non valida (401)' :
        res.status === 429 ? 'Limite Serper raggiunto (429)' :
        `Errore ricerca ${res.status}`
      return NextResponse.json({ error: msg }, { status: 502 })
    }

    const data = await res.json()
    const organic: { title?: string; link?: string; snippet?: string }[] = data?.organic || []

    const results = organic.slice(0, 5).map((r) => ({
      title: r.title || '',
      url: r.link || '',
      description: r.snippet || '',
    }))

    logAction(user.id, user.email || '', 'web_search', { query: q, professione, risultati: results.length }).catch(() => {})

    return NextResponse.json({ query: q, results })
  } catch (error) {
    console.error('Errore /api/search:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
