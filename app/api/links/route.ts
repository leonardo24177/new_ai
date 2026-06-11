import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

// Blocca loopback, reti private, link-local (incluso metadata cloud 169.254.169.254) e CGNAT
function isIpPrivato(ip: string): boolean {
  if (ip.includes(':')) {
    const lower = ip.toLowerCase()
    if (lower.startsWith('::ffff:')) return isIpPrivato(lower.slice(7))
    return (
      lower === '::1' || lower === '::' ||
      lower.startsWith('fe80') || lower.startsWith('fc') || lower.startsWith('fd')
    )
  }
  const [a, b] = ip.split('.').map(Number)
  return (
    a === 0 || a === 10 || a === 127 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254) ||
    (a === 100 && b >= 64 && b <= 127)
  )
}

// Accetta solo http/https verso host pubblici (risolve il DNS e verifica gli IP)
async function validaUrlPubblico(rawUrl: string): Promise<URL | null> {
  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    return null
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null

  const host = parsed.hostname.replace(/^\[|\]$/g, '') // toglie le parentesi degli IPv6 literal
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) {
    return null
  }

  try {
    if (isIP(host)) {
      if (isIpPrivato(host)) return null
    } else {
      const indirizzi = await lookup(host, { all: true })
      if (indirizzi.length === 0 || indirizzi.some(a => isIpPrivato(a.address))) return null
    }
  } catch {
    return null
  }
  return parsed
}

// Fetch con redirect seguiti manualmente: ogni hop viene ri-validato contro gli host privati
async function fetchPubblico(urlIniziale: string): Promise<Response | null> {
  let corrente = urlIniziale
  const MAX_REDIRECT = 3
  for (let i = 0; i <= MAX_REDIRECT; i++) {
    const valido = await validaUrlPubblico(corrente)
    if (!valido) return null

    const res = await fetch(valido.toString(), {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AI-Assistant/1.0)' },
      redirect: 'manual',
      signal: AbortSignal.timeout(10000), // 10 secondi timeout
    })

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location')
      if (!location) return null
      corrente = new URL(location, valido).toString()
      continue
    }
    return res
  }
  return null
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
    }

    // Il proxy blocca solo le pagine: il check approvazione va ripetuto sulle API
    if (user.app_metadata?.approvato !== true) {
      return NextResponse.json({ error: 'Account in attesa di approvazione' }, { status: 403 })
    }

    const { url, titolo, ambito, tipo_contesto, scarica_contenuto } = await req.json()

    if (!url) {
      return NextResponse.json({ error: 'URL mancante' }, { status: 400 })
    }

    // Valida URL: solo http/https verso host pubblici (anti-SSRF)
    if (!(await validaUrlPubblico(url))) {
      return NextResponse.json({ error: 'URL non valido' }, { status: 400 })
    }

    let testo_contenuto = ''
    let titolo_finale = titolo || url

    // Scraping opzionale
    if (scarica_contenuto) {
      try {
        const res = await fetchPubblico(url)

        if (res && res.ok) {
          const html = await res.text()

          // Estrai testo pulito dall'HTML
          const testo = html
            // Rimuovi script e style
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            // Rimuovi tag HTML
            .replace(/<[^>]+>/g, ' ')
            // Decodifica entità HTML comuni
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            // Pulisci spazi multipli
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 50000)

          testo_contenuto = testo

          // Cerca il titolo nella pagina
          const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
          if (titleMatch && !titolo) {
            titolo_finale = titleMatch[1].trim().slice(0, 200)
          }
        }
      } catch (scrapeError) {
        console.error('Errore scraping:', scrapeError)
        // Continua senza contenuto se lo scraping fallisce
      }
    }

    // Salva nel DB
    const insertData: Record<string, unknown> = {
      user_id: user.id,
      nome: titolo_finale,
      titolo: titolo_finale,
      tipo: 'link',
      url,
      tipo_contesto: ['profile', 'chat'].includes(tipo_contesto) ? tipo_contesto : 'profile',
      testo_contenuto: testo_contenuto || null,
      mime_type: 'text/html',
      dimensione: testo_contenuto.length,
    }

    if (ambito && ['lavoro', 'studio', 'personale'].includes(ambito)) {
      insertData.ambito = ambito
    }

    const { data: fileRecord, error: dbError } = await supabase
      .from('user_files')
      .insert(insertData)
      .select('id')
      .single()

    if (dbError) {
      return NextResponse.json({ error: `Errore DB: ${dbError.message}` }, { status: 500 })
    }

    return NextResponse.json({
      id: fileRecord.id,
      nome: titolo_finale,
      url,
      testo_estratto: testo_contenuto,
      dimensione: testo_contenuto.length,
      scaricato: scarica_contenuto && testo_contenuto.length > 0,
    })

  } catch (error) {
    console.error('Errore link:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
