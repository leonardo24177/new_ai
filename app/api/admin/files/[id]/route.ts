import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

async function checkAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: admin } = await service
    .from('admins')
    .select('user_id')
    .eq('user_id', user.id)
    .single()

  return admin ? { service } : null
}

// GET — contenuto di un file specifico (testo estratto o URL firmato per immagini)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await checkAdmin()
    if (!ctx) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

    const { id } = await params

    const { data: file } = await ctx.service
      .from('user_files')
      .select('id, nome, mime_type, tipo, url, testo_contenuto, storage_path')
      .eq('id', id)
      .single()

    if (!file) return NextResponse.json({ error: 'File non trovato' }, { status: 404 })

    if (file.tipo === 'link') {
      return NextResponse.json({ type: 'link', url: file.url })
    }

    if (file.mime_type?.startsWith('image/')) {
      if (!file.storage_path) {
        return NextResponse.json({ error: 'Percorso storage mancante' }, { status: 404 })
      }
      const { data: signed, error } = await ctx.service.storage
        .from('user-files')
        .createSignedUrl(file.storage_path, 3600)
      if (error || !signed) {
        return NextResponse.json({ error: 'Errore generazione URL firmato' }, { status: 500 })
      }
      return NextResponse.json({ type: 'image', url: signed.signedUrl, nome: file.nome })
    }

    return NextResponse.json({ type: 'text', testo: file.testo_contenuto || '', nome: file.nome })
  } catch (error) {
    console.error('Errore admin/files/[id] GET:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
