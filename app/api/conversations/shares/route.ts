import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data, error } = await supabase
    .from('conversation_shares')
    .select('share_token, conversation_id, expires_at, password_hash, created_at, conversations(titolo)')
    .eq('owner_user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const shares = (data || []).map(s => ({
    share_token: s.share_token,
    conversation_id: s.conversation_id,
    expires_at: s.expires_at,
    has_password: !!s.password_hash,
    created_at: s.created_at,
    titolo: (s.conversations as { titolo: string | null } | null)?.titolo || 'Conversazione',
  }))

  return NextResponse.json(shares)
}
