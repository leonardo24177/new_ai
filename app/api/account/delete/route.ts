import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function DELETE() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
    }

    const service = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 1. Recupera i path dei file nello storage per eliminarli
    const { data: files } = await service
      .from('user_files')
      .select('storage_path')
      .eq('user_id', user.id)
      .not('storage_path', 'is', null)

    if (files && files.length > 0) {
      const paths = files.map(f => f.storage_path).filter(Boolean) as string[]
      await service.storage.from('user-files').remove(paths)
    }

    // 2. Elimina dati tabelle (CASCADE gestisce messages via conversations)
    await service.from('user_files').delete().eq('user_id', user.id)
    await service.from('messages').delete().in(
      'conversation_id',
      (await service.from('conversations').select('id').eq('user_id', user.id)).data?.map(c => c.id) || []
    )
    await service.from('conversations').delete().eq('user_id', user.id)
    await service.from('user_ambiti').delete().eq('user_id', user.id)
    await service.from('user_configs').delete().eq('user_id', user.id)

    // 3. Elimina l'utente da auth
    const { error } = await service.auth.admin.deleteUser(user.id)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Errore eliminazione account:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
