import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { logAction } from '@/lib/audit'

// Il client SSR (cookie di sessione) serve solo a identificare il chiamante:
// le query devono usare un client service role puro, altrimenti viaggiano
// col JWT dell'admin e la RLS le filtra/blocca.
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

  return admin ? { service, adminUser: user } : null
}

// GET — tutti i file caricati dagli utenti
export async function GET() {
  try {
    const ctx = await checkAdmin()
    if (!ctx) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
    }

    // Supabase tronca le select a 1000 righe: si pagina finché il batch è pieno
    const PAGE = 1000
    const files: unknown[] = []
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await ctx.service
        .from('user_files')
        .select('id, user_id, nome, mime_type, dimensione, tipo_contesto, ambito, tipo, url, created_at')
        .order('created_at', { ascending: false })
        .range(from, from + PAGE - 1)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      files.push(...(data || []))
      if (!data || data.length < PAGE) break
    }

    return NextResponse.json({ files })
  } catch (error) {
    console.error('Errore admin/files GET:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

// DELETE — elimina un file utente (storage + record)
export async function DELETE(req: NextRequest) {
  try {
    const ctx = await checkAdmin()
    if (!ctx) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
    }
    const { service, adminUser } = ctx

    const { file_id } = await req.json()
    if (!file_id) {
      return NextResponse.json({ error: 'file_id mancante' }, { status: 400 })
    }

    const { data: file } = await service
      .from('user_files')
      .select('id, user_id, nome, storage_path, tipo')
      .eq('id', file_id)
      .single()

    if (!file) {
      return NextResponse.json({ error: 'File non trovato' }, { status: 404 })
    }

    // I link non hanno oggetto nello storage
    if (file.tipo !== 'link' && file.storage_path) {
      await service.storage.from('user-files').remove([file.storage_path])
    }

    const { error } = await service.from('user_files').delete().eq('id', file_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    logAction(adminUser.id, adminUser.email || '', 'admin_file_deleted', {
      target_user_id: file.user_id, nome: file.nome, file_id,
    }).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Errore admin/files DELETE:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
