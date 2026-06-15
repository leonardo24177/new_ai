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

// GET — URL firmato per il download di un file utente
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
      .select('id, nome, tipo, url, storage_path')
      .eq('id', id)
      .single()

    if (!file) return NextResponse.json({ error: 'File non trovato' }, { status: 404 })

    if (file.tipo === 'link' && file.url) {
      return NextResponse.redirect(file.url)
    }

    if (!file.storage_path) {
      return NextResponse.json({ error: 'Nessun file nello storage' }, { status: 404 })
    }

    const { data: signed, error } = await ctx.service.storage
      .from('user-files')
      .createSignedUrl(file.storage_path, 300, { download: file.nome })

    if (error || !signed) {
      return NextResponse.json({ error: 'Errore generazione URL download' }, { status: 500 })
    }

    return NextResponse.redirect(signed.signedUrl)
  } catch (error) {
    console.error('Errore admin/files/[id]/download GET:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
