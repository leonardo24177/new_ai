import { createClient } from '@supabase/supabase-js'

export type AuditAction =
  | 'chat_message'
  | 'file_upload'
  | 'share_create'
  | 'share_revoke'
  | 'account_delete'
  | 'user_approved'
  | 'limit_changed'
  | 'onboarding_generate'

export async function logAction(
  userId: string,
  userEmail: string,
  action: AuditAction,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  await service.from('audit_logs').insert({ user_id: userId, user_email: userEmail, action, metadata })
}
