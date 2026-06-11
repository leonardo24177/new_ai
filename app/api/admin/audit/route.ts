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

export async function GET(req: NextRequest) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const action     = searchParams.get('action') || ''
  const userEmail  = searchParams.get('user_email') || ''
  const dateFrom   = searchParams.get('date_from') || ''
  const dateTo     = searchParams.get('date_to') || ''
  const offset     = parseInt(searchParams.get('offset') || '0', 10)
  const limit      = 50

  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  let query = service
    .from('audit_logs')
    .select('id, user_id, user_email, action, metadata, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (action) query = query.eq('action', action)
  if (userEmail) query = query.ilike('user_email', `%${userEmail}%`)
  if (dateFrom) query = query.gte('created_at', new Date(dateFrom).toISOString())
  if (dateTo) {
    const end = new Date(dateTo)
    end.setDate(end.getDate() + 1)
    query = query.lt('created_at', end.toISOString())
  }

  const { data, error, count } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ logs: data || [], total: count || 0 })
}
