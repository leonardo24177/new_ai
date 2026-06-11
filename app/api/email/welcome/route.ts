import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export async function POST(req: NextRequest) {
  const { email } = await req.json()

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email mancante' }, { status: 400 })
  }

  const apiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL

  if (!apiKey || !fromEmail) {
    return NextResponse.json({ ok: true })
  }

  // La signUp non crea sessione (serve conferma email), quindi la route non può
  // richiedere auth: verifica invece che l'email appartenga a un utente registrato
  // negli ultimi 15 minuti, e prende il nome dai suoi metadata (non dal body).
  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: authData } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const utente = authData?.users.find(u => u.email?.toLowerCase() === email.toLowerCase())
  const FINESTRA_MS = 15 * 60 * 1000
  if (!utente || Date.now() - new Date(utente.created_at).getTime() > FINESTRA_MS) {
    // Risposta identica al successo per non rivelare quali email sono registrate
    return NextResponse.json({ ok: true })
  }

  const nome = utente.user_metadata?.nome
  const nomeDisplay = escapeHtml(
    (typeof nome === 'string' && nome.trim()) ? nome.trim() : 'Benvenuto'
  )

  const html = `<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:#fff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden;">
    <div style="background:#111827;padding:24px 32px;text-align:center;">
      <div style="display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;background:rgba(255,255,255,0.1);border-radius:10px;margin-bottom:12px;">
        <span style="color:#fff;font-size:13px;font-weight:700;">AI</span>
      </div>
      <p style="color:#fff;font-size:16px;font-weight:600;margin:0;">Assistente AI</p>
    </div>
    <div style="padding:32px;">
      <h1 style="color:#111827;font-size:20px;font-weight:700;margin:0 0 8px;">Ciao, ${nomeDisplay}!</h1>
      <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 24px;">
        Grazie per esserti registrato su Assistente AI. Siamo felici di averti a bordo.
      </p>
      <div style="background:#f9fafb;border-radius:12px;padding:20px;margin-bottom:24px;">
        <p style="color:#374151;font-size:13px;font-weight:600;margin:0 0 12px;">Cosa succede adesso:</p>
        <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:10px;">
          <span style="background:#111827;color:#fff;border-radius:6px;width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;">1</span>
          <p style="color:#6b7280;font-size:13px;margin:0;line-height:1.5;">Conferma la tua email cliccando il link che ti abbiamo inviato separatamente.</p>
        </div>
        <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:10px;">
          <span style="background:#111827;color:#fff;border-radius:6px;width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;">2</span>
          <p style="color:#6b7280;font-size:13px;margin:0;line-height:1.5;">Il tuo account sarà attivato dal nostro team. Riceverai una notifica quando sarà pronto.</p>
        </div>
        <div style="display:flex;align-items:flex-start;gap:10px;">
          <span style="background:#111827;color:#fff;border-radius:6px;width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;">3</span>
          <p style="color:#6b7280;font-size:13px;margin:0;line-height:1.5;">Configura il tuo assistente e inizia a usarlo con i tuoi documenti e fonti.</p>
        </div>
      </div>
      <p style="color:#9ca3af;font-size:12px;margin:0;line-height:1.5;">
        Per qualsiasi domanda, rispondi a questa email o contattaci su assistente-ai.it.
      </p>
    </div>
    <div style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;text-align:center;">
      <p style="color:#9ca3af;font-size:11px;margin:0;">© 2025 Assistente AI — assistente-ai.it</p>
    </div>
  </div>
</body>
</html>`

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `Assistente AI <${fromEmail}>`,
        to: [email],
        subject: 'Benvenuto su Assistente AI',
        html,
      }),
    })

    if (!res.ok) {
      console.error('Resend welcome email error:', await res.text())
    }
  } catch (err) {
    console.error('Resend welcome email fetch error:', err)
  }

  return NextResponse.json({ ok: true })
}
