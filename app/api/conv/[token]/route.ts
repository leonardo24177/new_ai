import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { verifySharePassword } from '@/lib/share-password'

// Limite tentativi password in memoria, per token+IP. Su Vercel la mappa è
// per-istanza (un attaccante distribuito può aggirarla), ma alza comunque
// il costo del brute force senza richiedere Redis.
const tentativi = new Map<string, { count: number; resetAt: number }>()
const MAX_TENTATIVI = 10
const FINESTRA_MS = 5 * 60 * 1000

function troppiTentativi(key: string): boolean {
  const now = Date.now()
  if (tentativi.size > 1000) {
    for (const [k, v] of tentativi) {
      if (now > v.resetAt) tentativi.delete(k)
    }
  }
  const entry = tentativi.get(key)
  if (!entry || now > entry.resetAt) {
    tentativi.set(key, { count: 1, resetAt: now + FINESTRA_MS })
    return false
  }
  entry.count++
  return entry.count > MAX_TENTATIVI
}

async function resolveShare(token: string, password?: string) {
  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: share } = await supabase
    .from('conversation_shares')
    .select('conversation_id, password_hash, expires_at')
    .eq('share_token', token)
    .single()

  if (!share) return { error: 'Link non valido', status: 404 }

  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    return { error: 'Link scaduto', status: 410 }
  }

  if (share.password_hash) {
    if (!password) return { requires_password: true, status: 401 }
    if (!verifySharePassword(password, share.password_hash)) {
      return { error: 'Password errata', status: 403 }
    }
  }

  const { data: conv } = await supabase
    .from('conversations')
    .select('id, titolo, created_at')
    .eq('id', share.conversation_id)
    .single()

  if (!conv) return { error: 'Conversazione non trovata', status: 404 }

  const { data: msgs } = await supabase
    .from('messages')
    .select('ruolo, contenuto, created_at')
    .eq('conversation_id', conv.id)
    .order('created_at', { ascending: true })

  return {
    conversation: { id: conv.id, titolo: conv.titolo, created_at: conv.created_at },
    messages: msgs || [],
    expires_at: share.expires_at,
  }
}

// GET — lettura pubblica (senza password)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const result = await resolveShare(token)
  const status = 'status' in result ? result.status : 200
  return NextResponse.json(result, { status })
}

// POST — lettura pubblica con password
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'sconosciuto'
  if (troppiTentativi(`${token}:${ip}`)) {
    return NextResponse.json({ error: 'Troppi tentativi. Riprova tra qualche minuto.' }, { status: 429 })
  }

  const body = await req.json()
  const result = await resolveShare(token, body.password)
  const status = 'status' in result ? result.status : 200
  return NextResponse.json(result, { status })
}
