import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { MODELS } from '@/lib/model-pricing'
import { logAction } from '@/lib/audit'
import { superaLimiteOrario } from '@/lib/rate-limit'

// L'OCR via Claude sui PDF scansionati può richiedere 30-50s: serve più del default Vercel
export const maxDuration = 60

// Tetto testo estratto per file (in chat i file di profilo sono ulteriormente limitati)
const MAX_TESTO_ESTRATTO = 150000

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

    // Rate limiting: l'OCR sui PDF scansionati chiama Claude — max 30 upload/ora
    if (await superaLimiteOrario(user.id, 'file_upload', 30)) {
      return NextResponse.json({ error: 'Limite orario di caricamenti raggiunto. Riprova più tardi.' }, { status: 429 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    const tipoContestoRaw = formData.get('tipo_contesto') as string
    const tipo_contesto = ['profile', 'chat'].includes(tipoContestoRaw) ? tipoContestoRaw : 'profile'
    const ambito = formData.get('ambito') as string | null || null

    if (!file) {
      return NextResponse.json({ error: 'Nessun file' }, { status: 400 })
    }

    // Tipi MIME accettati — inclusi file di codice e testo generico
    const MIME_CONSENTITI = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/json',
      'application/xml',
      'image/jpeg',
      'image/png',
      'image/webp',
      'text/plain',
      'text/markdown',
      'text/csv',
      'text/html',
      'text/css',
      'text/javascript',
      'text/typescript',
      'text/x-python',
      'text/x-java',
      'text/x-c',
      'text/x-cpp',
      'text/x-rust',
      'text/x-go',
      'text/xml',
    ]

    // Estensioni di codice accettate anche se il mime non è riconosciuto
    const ESTENSIONI_CODICE = [
      '.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.c', '.cpp', '.h',
      '.cs', '.go', '.rs', '.rb', '.php', '.swift', '.kt', '.sql',
      '.sh', '.bash', '.zsh', '.yml', '.yaml', '.toml', '.ini', '.env',
      '.json', '.xml', '.html', '.css', '.scss', '.sass', '.less',
      '.md', '.mdx', '.txt', '.csv', '.log', '.gitignore', '.eslintrc',
      '.prettierrc', '.babelrc', '.editorconfig',
    ]

    const nomeFile = file.name.toLowerCase()
    const estensione = '.' + nomeFile.split('.').pop()
    const isCodice = ESTENSIONI_CODICE.includes(estensione) || ESTENSIONI_CODICE.some(e => nomeFile.endsWith(e))
    const isMimeAccettato = MIME_CONSENTITI.includes(file.type) || file.type.startsWith('text/')

    if (file.type === 'application/vnd.ms-powerpoint' || nomeFile.endsWith('.ppt')) {
      return NextResponse.json({ error: 'Il formato .ppt non è supportato. Converti il file in .pptx o PDF prima di caricarlo.' }, { status: 400 })
    }

    if (file.type === 'application/msword' || nomeFile.endsWith('.doc')) {
      return NextResponse.json({ error: 'Il formato .doc non è supportato. Converti il file in .docx o PDF prima di caricarlo.' }, { status: 400 })
    }

    if (!isMimeAccettato && !isCodice) {
      return NextResponse.json({ error: `Tipo file non supportato: ${file.type}` }, { status: 400 })
    }

    const MAX_SIZE = 20 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File troppo grande (max 20MB)' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const storagePath = `${user.id}/${Date.now()}_${file.name}`

    const { error: uploadError } = await supabase.storage
      .from('user-files')
      .upload(storagePath, buffer, {
        contentType: file.type || 'text/plain',
        upsert: false,
      })

    if (uploadError) {
      return NextResponse.json({ error: `Errore upload: ${uploadError.message}` }, { status: 500 })
    }

    let testo_estratto = ''

    try {
      if (file.type === 'application/pdf') {
        // Prova prima l'estrazione testuale standard (pdf-parse v2: classe PDFParse, non funzione)
        let numPagine = 1
        try {
          const { PDFParse } = await import('pdf-parse')
          const parser = new PDFParse({ data: new Uint8Array(buffer) })
          const parsed = await parser.getText()
          await parser.destroy()
          numPagine = parsed.pages?.length || 1
          // Marcatori [Pagina N] per permettere citazioni precise in chat
          if (parsed.pages && parsed.pages.length > 1) {
            testo_estratto = parsed.pages
              .map((p: { num: number; text: string }) => `[Pagina ${p.num}]\n${(p.text || '').trim()}`)
              .join('\n\n')
              .trim()
              .slice(0, MAX_TESTO_ESTRATTO)
          } else {
            testo_estratto = parsed.text?.trim().slice(0, MAX_TESTO_ESTRATTO) || ''
          }
        } catch (parseError) {
          console.error('Errore pdf-parse:', parseError)
          testo_estratto = ''
        }

        // PDF scansionato → Claude OCR. Soglia per pagina: i documenti scansionati con
        // intestazione digitale producono ~20 char/pagina, una pagina di testo vero 1000+.
        // Limite 10MB per non sovraccaricare l'API con file enormi.
        const sogliaOcr = Math.max(100, 80 * numPagine)
        if (testo_estratto.length < sogliaOcr && file.size <= 10 * 1024 * 1024) {
          try {
            const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
            // Streaming: se il timeout scatta a metà, si conserva il testo già estratto
            const stream = anthropic.messages.stream({
              model: MODELS.haiku,
              max_tokens: 8192,
              messages: [{
                role: 'user',
                content: [
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  {
                    type: 'document',
                    source: {
                      type: 'base64',
                      media_type: 'application/pdf',
                      data: buffer.toString('base64'),
                    },
                  } as any,
                  {
                    type: 'text',
                    text: 'Estrai tutto il testo leggibile da questo documento PDF. Segna l\'inizio di ogni pagina con [Pagina N] su una riga a sé. Restituisci solo il testo estratto, senza commenti o introduzioni.',
                  },
                ],
              }],
            })
            // Timeout 50s per restare sotto maxDuration 60s
            let testoOcr = ''
            const timer = setTimeout(() => stream.abort(), 50000)
            try {
              for await (const event of stream) {
                if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                  testoOcr += event.delta.text
                }
              }
            } catch {
              // Abort per timeout: si tiene il parziale accumulato
            }
            clearTimeout(timer)
            if (testoOcr.trim().length > testo_estratto.length) {
              testo_estratto = testoOcr.trim().slice(0, MAX_TESTO_ESTRATTO)
            }
          } catch (ocrError) {
            console.error('Errore OCR Claude:', ocrError)
          }
        }
      }
      else if (
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.type === 'application/msword'
      ) {
        const mammoth = await import('mammoth')
        const result = await mammoth.extractRawText({ buffer })
        testo_estratto = result.value?.slice(0, MAX_TESTO_ESTRATTO) || ''
      }
      else if (
        file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.type === 'application/vnd.ms-excel'
      ) {
        const XLSX = await import('xlsx')
        const workbook = XLSX.read(buffer, { type: 'buffer' })
        const sheets = workbook.SheetNames.map((name: string) => {
          const sheet = workbook.Sheets[name]
          return `[Foglio: ${name}]\n${XLSX.utils.sheet_to_csv(sheet)}`
        })
        testo_estratto = sheets.join('\n\n').slice(0, MAX_TESTO_ESTRATTO)
      }
      else if (file.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
        const JSZip = (await import('jszip')).default
        const zip = await JSZip.loadAsync(buffer)
        const slideFiles = Object.keys(zip.files)
          .filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name))
          .sort((a, b) => {
            const numA = parseInt(a.match(/\d+/)?.[0] || '0')
            const numB = parseInt(b.match(/\d+/)?.[0] || '0')
            return numA - numB
          })
        const testi: string[] = []
        for (const slideName of slideFiles) {
          const xml = await zip.files[slideName].async('text')
          const matches = xml.match(/<a:t[^>]*>([^<]+)<\/a:t>/g) || []
          const testoSlide = matches
            .map(m => m.replace(/<[^>]+>/g, '').trim())
            .filter(t => t.length > 0)
            .join(' ')
          if (testoSlide) testi.push(testoSlide)
        }
        testo_estratto = testi.join('\n').slice(0, MAX_TESTO_ESTRATTO)
      }
      else if (file.type.startsWith('image/')) {
        testo_estratto = `[Immagine: ${file.name}]`
      }
      else if (
        file.type.startsWith('text/') ||
        file.type === 'application/json' ||
        file.type === 'application/xml' ||
        isCodice
      ) {
        // File di testo, codice, JSON, XML, Markdown, ecc.
        testo_estratto = buffer.toString('utf-8').slice(0, MAX_TESTO_ESTRATTO)
      }
    } catch (extractError) {
      console.error('Errore estrazione testo:', extractError)
      // Per i file di codice, prova comunque a leggere come testo
      if (isCodice) {
        try {
          testo_estratto = buffer.toString('utf-8').slice(0, MAX_TESTO_ESTRATTO)
        } catch {
          testo_estratto = ''
        }
      }
    }

    const insertData: Record<string, unknown> = {
      user_id: user.id,
      nome: file.name,
      tipo_contesto,
      storage_path: storagePath,
      mime_type: file.type || 'text/plain',
      dimensione: file.size,
      testo_contenuto: testo_estratto.trim(),
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

    logAction(user.id, user.email || '', 'file_upload', {
      nome: file.name, mime_type: file.type, dimensione: file.size, tipo_contesto, ambito,
    }).catch(() => {})

    return NextResponse.json({
      id: fileRecord.id,
      nome: file.name,
      storage_path: storagePath,
      testo_estratto: testo_estratto.trim(),
      mime_type: file.type || 'text/plain',
      dimensione: file.size,
      ambito,
    })

  } catch (error) {
    console.error('Errore upload:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
