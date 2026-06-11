import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { logAction } from '@/lib/audit'
import { COSTO_MENSILE_DEFAULT } from '@/lib/model-pricing'

async function createServiceClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}

async function checkAdmin() {
  const supabase = await createServiceClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: admin } = await supabase
    .from('admins')
    .select('user_id')
    .eq('user_id', user.id)
    .single()

  return admin ? supabase : null
}

// GET — lista utenti
export async function GET() {
  try {
    const supabase = await checkAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
    }

    const { data: configs } = await supabase
      .from('user_configs')
      .select('user_id, system_prompt_base, nome_assistente, updated_at')

    const { data: ambiti } = await supabase
      .from('user_ambiti')
      .select('user_id, ambito, system_prompt_extra')

    const { data: limits } = await supabase
      .from('user_limits')
      .select('user_id, limite_mensile')

    const { data: authData, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })

    if (error) {
      console.error('Errore listUsers:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const users = (authData?.users || []).map(u => {
      const config = configs?.find(c => c.user_id === u.id)
      const userAmbiti = ambiti?.filter(a => a.user_id === u.id) || []
      const base = config?.system_prompt_base || ''

      const system_prompts = userAmbiti.map(a => ({
        ambito: a.ambito,
        prompt: a.system_prompt_extra
          ? `${base}\n\n---\n${a.system_prompt_extra}`
          : base,
      }))

      return {
        id: u.id,
        email: u.email || '',
        created_at: u.created_at,
        nome: u.user_metadata?.nome || config?.nome_assistente || '',
        system_prompt_base: base,
        system_prompts,
        ambiti: userAmbiti.map(a => a.ambito),
        approvato: u.app_metadata?.approvato === true,
        limite_mensile: Number(limits?.find(l => l.user_id === u.id)?.limite_mensile) || COSTO_MENSILE_DEFAULT,
      }
    })

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Errore admin/users GET:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

// PATCH — approva o revoca utente
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await checkAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
    }

    const { user_id, approvato, new_password, limite_mensile } = await req.json()
    if (!user_id) {
      return NextResponse.json({ error: 'user_id mancante' }, { status: 400 })
    }

    if (limite_mensile !== undefined) {
      const limite = Number(limite_mensile)
      if (!Number.isFinite(limite) || limite <= 0 || limite > 1000) {
        return NextResponse.json({ error: 'Limite non valido (deve essere tra $0 e $1000)' }, { status: 400 })
      }
      const { error } = await supabase
        .from('user_limits')
        .upsert({ user_id, limite_mensile: limite })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      const { data: { user: adminUser } } = await supabase.auth.getUser()
      logAction(adminUser?.id || '', adminUser?.email || '', 'limit_changed', {
        target_user_id: user_id, limite_mensile: limite,
      }).catch(() => {})

      return NextResponse.json({ success: true })
    }

    if (new_password !== undefined) {
      if (typeof new_password !== 'string' || new_password.length < 8) {
        return NextResponse.json({ error: 'Password troppo corta (min 8 caratteri)' }, { status: 400 })
      }
      const { error } = await supabase.auth.admin.updateUserById(user_id, { password: new_password })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true })
    }

    if (typeof approvato !== 'boolean') {
      return NextResponse.json({ error: 'Parametri mancanti' }, { status: 400 })
    }

    const { error } = await supabase.auth.admin.updateUserById(user_id, {
      app_metadata: { approvato },
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const { data: { user: adminUser } } = await supabase.auth.getUser()
    logAction(adminUser?.id || '', adminUser?.email || '', 'user_approved', {
      target_user_id: user_id, approvato,
    }).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Errore admin/users PATCH:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

// DELETE — elimina utente
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await checkAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
    }

    const { user_id } = await req.json()
    if (!user_id) {
      return NextResponse.json({ error: 'user_id mancante' }, { status: 400 })
    }

    const { error } = await supabase.auth.admin.deleteUser(user_id)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Errore admin/users DELETE:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
