import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

    const MIME_CONSENTITI = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/msword',
      'image/jpeg',
      'image/png',
      'image/webp',
      'text/plain',
    ]

    if (!MIME_CONSENTITI.includes(file.type)) {
      return NextResponse.json({ error: 'Tipo file non supportato' }, { status: 400 })
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
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      return NextResponse.json({ error: `Errore upload: ${uploadError.message}` }, { status: 500 })
    }

    let testo_estratto = ''

    try {
      if (file.type === 'application/pdf') {
        const pdfParseModule = await import('pdf-parse')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pdfParse = await import('pdf-parse').then((m: any) => m.default || m)
        const parsed = await pdfParse(buffer)
        testo_estratto = parsed.text?.slice(0, 50000) || ''
      }
      else if (
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.type === 'application/msword'
      ) {
        const mammoth = await import('mammoth')
        const result = await mammoth.extractRawText({ buffer })
        testo_estratto = result.value?.slice(0, 50000) || ''
      }
      else if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        const XLSX = await import('xlsx')
        const workbook = XLSX.read(buffer, { type: 'buffer' })
        const sheets = workbook.SheetNames.map(name => {
          const sheet = workbook.Sheets[name]
          return `[Foglio: ${name}]\n${XLSX.utils.sheet_to_csv(sheet)}`
        })
        testo_estratto = sheets.join('\n\n').slice(0, 50000)
      }
      else if (file.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
        testo_estratto = `[File PowerPoint: ${file.name}]`
      }
      else if (file.type.startsWith('image/')) {
        testo_estratto = `[Immagine: ${file.name}]`
      }
      else if (file.type === 'text/plain') {
        testo_estratto = buffer.toString('utf-8').slice(0, 50000)
      }
    } catch (extractError) {
      console.error('Errore estrazione testo:', extractError)
      testo_estratto = ''
    }

    const insertData: Record<string, unknown> = {
      user_id: user.id,
      nome: file.name,
      tipo_contesto,
      storage_path: storagePath,
      mime_type: file.type,
      dimensione: file.size,
    }

    // Aggiungi ambito solo se presente
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
      mime_type: file.type,
      dimensione: file.size,
      ambito,
    })

  } catch (error) {
    console.error('Errore upload:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
