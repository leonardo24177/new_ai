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

// GET — tutte le skill personali degli utenti
export async function GET() {
  try {
    const ctx = await checkAdmin()
    if (!ctx) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
    }

    const { data: skills, error } = await ctx.service
      .from('skills')
      .select('id, user_id, slug, label, extra_sys')
      .not('user_id', 'is', null)
      .order('label')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ skills: skills || [] })
  } catch (error) {
    console.error('Errore admin/personal-skills GET:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

// DELETE — elimina una skill personale (mai quelle globali da qui)
export async function DELETE(req: NextRequest) {
  try {
    const ctx = await checkAdmin()
    if (!ctx) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
    }
    const { service, adminUser } = ctx

    const { skill_id } = await req.json()
    if (!skill_id) {
      return NextResponse.json({ error: 'skill_id mancante' }, { status: 400 })
    }

    const { data: skill } = await service
      .from('skills')
      .select('id, user_id, label')
      .eq('id', skill_id)
      .not('user_id', 'is', null)
      .single()

    if (!skill) {
      return NextResponse.json({ error: 'Skill personale non trovata' }, { status: 404 })
    }

    const { error } = await service.from('skills').delete().eq('id', skill_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    logAction(adminUser.id, adminUser.email || '', 'admin_skill_deleted', {
      target_user_id: skill.user_id, label: skill.label, skill_id,
    }).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Errore admin/personal-skills DELETE:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
