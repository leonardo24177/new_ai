import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerSupabase } from '@/lib/supabase/server'

async function checkAdmin() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  // Check su admins via service role: col JWT utente la RLS nasconderebbe la tabella
  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: admin } = await service.from('admins').select('user_id').eq('user_id', user.id).single()
  return !!admin
}

// GET — conversazione completa con messaggi, per il viewer del tab Audit
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  const { id } = await params

  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: conv, error: convError } = await service
    .from('conversations')
    .select('id, titolo, user_id, created_at')
    .eq('id', id)
    .single()

  if (convError || !conv) {
    return NextResponse.json({ error: 'Conversazione non trovata (forse eliminata)' }, { status: 404 })
  }

  const { data: messaggi, error: msgError } = await service
    .from('messages')
    .select('id, ruolo, contenuto, modello, tokens_input, tokens_output, costo_stimato, created_at')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true })

  if (msgError) {
    return NextResponse.json({ error: msgError.message }, { status: 500 })
  }

  return NextResponse.json({ conversazione: conv, messaggi: messaggi || [] })
}
