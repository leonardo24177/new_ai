// Diagnostica limiti utente: spesa mensile e messaggi/ora (vedi /api/chat/route.ts)
// Uso: node scripts/diagnosi-limiti.mjs
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter(l => l.includes('='))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
)

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const now = new Date()
const primoDelMese = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
const unOraFa = new Date(Date.now() - 60 * 60 * 1000).toISOString()

// Utenti
const { data: usersData, error: usersErr } = await supabase.auth.admin.listUsers({ perPage: 1000 })
if (usersErr) { console.error('Errore listUsers:', usersErr.message); process.exit(1) }
const utenti = new Map(usersData.users.map(u => [u.id, {
  email: u.email,
  approvato: u.app_metadata?.approvato === true,
}]))

// Conversazioni → mappa conv_id → user_id
const { data: convs, error: convErr } = await supabase
  .from('conversations').select('id, user_id').limit(10000)
if (convErr) { console.error('Errore conversations:', convErr.message); process.exit(1) }
const convToUser = new Map(convs.map(c => [c.id, c.user_id]))

// Messaggi dal primo del mese (paginati)
const messaggi = []
for (let from = 0; ; from += 1000) {
  const { data, error } = await supabase
    .from('messages')
    .select('conversation_id, ruolo, costo_stimato, created_at')
    .gte('created_at', primoDelMese)
    .order('created_at', { ascending: true })
    .range(from, from + 999)
  if (error) { console.error('Errore messages:', error.message); process.exit(1) }
  messaggi.push(...data)
  if (data.length < 1000) break
}

const stats = new Map()
for (const m of messaggi) {
  const userId = convToUser.get(m.conversation_id)
  if (!userId) continue
  if (!stats.has(userId)) stats.set(userId, { costoMese: 0, msgUltimaOra: 0, ultimoMsg: null })
  const s = stats.get(userId)
  s.costoMese += m.costo_stimato || 0
  if (m.ruolo === 'user' && m.created_at >= unOraFa) s.msgUltimaOra++
  if (!s.ultimoMsg || m.created_at > s.ultimoMsg) s.ultimoMsg = m.created_at
}

console.log(`Mese corrente da: ${primoDelMese}  |  Limiti: $5.00/mese, 60 msg/ora\n`)
const righe = [...stats.entries()]
  .map(([id, s]) => ({ id, ...s, ...(utenti.get(id) || { email: '(utente eliminato)', approvato: false }) }))
  .sort((a, b) => b.costoMese - a.costoMese)

for (const r of righe) {
  const flagCosto = r.costoMese >= 5 ? '  ⛔ LIMITE MENSILE SUPERATO' : ''
  const flagOra = r.msgUltimaOra + 1 > 60 ? '  ⛔ LIMITE ORARIO' : ''
  console.log(
    `${r.email}\n` +
    `  approvato: ${r.approvato}  |  spesa mese: $${r.costoMese.toFixed(4)}${flagCosto}\n` +
    `  msg ultima ora: ${r.msgUltimaOra}${flagOra}  |  ultimo messaggio: ${r.ultimoMsg}\n`
  )
}

// Utenti senza messaggi questo mese
const senzaMsg = [...utenti.entries()].filter(([id]) => !stats.has(id))
if (senzaMsg.length) {
  console.log('Utenti senza messaggi questo mese:')
  for (const [, u] of senzaMsg) console.log(`  ${u.email} (approvato: ${u.approvato})`)
}
