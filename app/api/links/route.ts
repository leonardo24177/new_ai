import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
    }

    const { url, titolo, ambito, tipo_contesto, scarica_contenuto } = await req.json()

    if (!url) {
      return NextResponse.json({ error: 'URL mancante' }, { status: 400 })
    }

    // Valida URL
    try {
      new URL(url)
    } catch {
      return NextResponse.json({ error: 'URL non valido' }, { status: 400 })
    }

    let testo_contenuto = ''
    let titolo_finale = titolo || url

    // Scraping opzionale
    if (scarica_contenuto) {
      try {
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; AI-Assistant/1.0)',
          },
          signal: AbortSignal.timeout(10000), // 10 secondi timeout
        })

        if (res.ok) {
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
      tipo_contesto: tipo_contesto || 'profile',
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
