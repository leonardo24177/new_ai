import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

// Ping periodico per evitare l'auto-pause di Supabase Free (progetto sospeso
// dopo 7gg senza attività API). Nessuna logica di business: una sola query
// leggera basta a resettare il timer. Chiamata dal cron Vercel (vercel.json).
export async function GET(request: NextRequest) {
  if (process.env.CRON_SECRET) {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  await supabase.from('admins').select('user_id').limit(1)

  return NextResponse.json({ ok: true })
}
