import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createHash } from 'crypto'

function hashPassword(pw: string): string {
  return createHash('sha256').update(pw).digest('hex')
}

function calcExpiresAt(expiresIn: string | null | undefined): string | null {
  if (!expiresIn || expiresIn === 'mai') return null
  const d = new Date()
  if (expiresIn === '7d') d.setDate(d.getDate() + 7)
  else if (expiresIn === '30d') d.setDate(d.getDate() + 30)
  else return null
  return d.toISOString()
}

// GET — stato condivisione per una conversazione
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

    const { data: conv } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()
    if (!conv) return NextResponse.json({ error: 'Conversazione non trovata' }, { status: 404 })

    const { data: share } = await supabase
      .from('conversation_shares')
      .select('share_token, expires_at, password_hash')
      .eq('conversation_id', id)
      .eq('owner_user_id', user.id)
      .single()

    if (!share) return NextResponse.json({ token: null, expires_at: null, has_password: false })

    return NextResponse.json({
      token: share.share_token,
      expires_at: share.expires_at,
      has_password: !!share.password_hash,
    })
  } catch {
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

// POST — crea o rigenera link di condivisione
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

    const { data: conv } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()
    if (!conv) return NextResponse.json({ error: 'Conversazione non trovata' }, { status: 404 })

    const body = await req.json()
    const expires_at = calcExpiresAt(body.expires_in)
    const password_hash = body.password ? hashPassword(body.password) : null
    const token = crypto.randomUUID()

    // Rimuove share esistente (se c'è) e ne crea uno nuovo
    await supabase
      .from('conversation_shares')
      .delete()
      .eq('conversation_id', id)
      .eq('owner_user_id', user.id)

    const { error } = await supabase
      .from('conversation_shares')
      .insert({ conversation_id: id, owner_user_id: user.id, share_token: token, password_hash, expires_at })

    if (error) return NextResponse.json({ error: 'Errore creazione link' }, { status: 500 })

    return NextResponse.json({ token, expires_at, has_password: !!password_hash })
  } catch {
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

// DELETE — revoca link di condivisione
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

    await supabase
      .from('conversation_shares')
      .delete()
      .eq('conversation_id', id)
      .eq('owner_user_id', user.id)

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
