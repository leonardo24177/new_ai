import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    const tipo_contesto = formData.get('tipo_contesto') as string || 'profile'
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
        // Prova prima l'estrazione testuale standard
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const pdfParse = await import('pdf-parse').then((m: any) => m.default || m)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const parsed = await (pdfParse as any)(buffer)
          testo_estratto = parsed.text?.trim().slice(0, 50000) || ''
        } catch {
          testo_estratto = ''
        }

        // Se il testo è quasi vuoto, è probabilmente un PDF scansionato — usa Claude OCR
        // Limite 10MB per non sovraccaricare l'API con file enormi
        if (testo_estratto.length < 100 && file.size <= 10 * 1024 * 1024) {
          try {
            const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
            const ocrPromise = anthropic.messages.create({
              model: 'claude-haiku-4-5-20251001',
              max_tokens: 4096,
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
                    text: 'Estrai tutto il testo leggibile da questo documento PDF. Restituisci solo il testo estratto, senza commenti o introduzioni.',
                  },
                ],
              }],
            })
            // Timeout 20s per non superare il limite Vercel di 30s
            const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 20000))
            const risposta = await Promise.race([ocrPromise, timeout])
            if (risposta && risposta.content[0].type === 'text') {
              testo_estratto = risposta.content[0].text.slice(0, 50000)
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
        testo_estratto = result.value?.slice(0, 50000) || ''
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
        testo_estratto = sheets.join('\n\n').slice(0, 50000)
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
        testo_estratto = testi.join('\n').slice(0, 50000)
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
        testo_estratto = buffer.toString('utf-8').slice(0, 50000)
      }
    } catch (extractError) {
      console.error('Errore estrazione testo:', extractError)
      // Per i file di codice, prova comunque a leggere come testo
      if (isCodice) {
        try {
          testo_estratto = buffer.toString('utf-8').slice(0, 50000)
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
