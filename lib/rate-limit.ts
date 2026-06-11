import { createClient } from '@supabase/supabase-js'
import type { AuditAction } from './audit'

// Conta le azioni dell'ultima ora su audit_logs (service role, bypassa RLS).
// Come per il rate limiting di /api/chat, la race condition tra richieste
// concorrenti è accettabile a questa scala.
export async function superaLimiteOrario(
  userId: string,
  action: AuditAction,
  maxPerOra: number
): Promise<boolean> {
  try {
    const service = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const unOraFa = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count } = await service
      .from('audit_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('action', action)
      .gte('created_at', unOraFa)
    // +1 per contare anche l'azione corrente non ancora loggata
    return (count ?? 0) + 1 > maxPerOra
  } catch {
    // In caso di errore non bloccare l'utente
    return false
  }
}
