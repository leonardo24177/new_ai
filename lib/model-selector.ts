// lib/model-selector.ts
// Selezione dinamica del modello in base alla complessità della richiesta

interface ModelSelectorInput {
  userMessage: string
  messages: { role: string; content: string }[]
  fileContexts?: { nome: string; testo: string }[]
  activeSkillSlugs?: string[]
  professione?: string
}

interface ModelSelection {
  model: string
  reason: string
  score: number
}

// Parole chiave che indicano alta complessità
const OPUS_KEYWORDS = [
  'redigi', 'redigere', 'redazione', 'analizza in dettaglio', 'analisi approfondita',
  'confronta', 'paragona', 'elabora', 'struttura', 'pianifica', 'strategia',
  'contratto', 'atto', 'sentenza', 'ricorso', 'memoria', 'perizia', 'relazione tecnica',
  'bilancio', 'dichiarazione', 'calcola', 'verifica tutti', 'esamina tutto',
  'riassumi tutto', 'analizza tutti', 'revisiona', 'correggi tutto',
]

const SONNET_KEYWORDS = [
  'spiega', 'come funziona', 'cosa significa', 'dimmi', 'aiutami',
  'quali sono', 'elenca', 'descrivi', 'esempio', 'differenza tra',
  'quando si', 'perché', 'come si', 'cosa devo', 'posso',
]

// Professioni che richiedono maggiore precisione
const HIGH_PRECISION_PROFESSIONS = ['avvocato', 'commercialista', 'medico', 'architetto']

export function selectModel(input: ModelSelectorInput): ModelSelection {
  let score = 0
  const reasons: string[] = []

  const msg = input.userMessage.toLowerCase()
  const conversationLength = input.messages.length
  const fileCount = input.fileContexts?.filter(f => f.testo?.length > 0).length || 0
  const skillCount = input.activeSkillSlugs?.length || 0

  // --- FATTORI CHE AUMENTANO LA COMPLESSITÀ ---

  // 1. Lunghezza messaggio
  if (input.userMessage.length > 500) {
    score += 30
    reasons.push('messaggio lungo')
  } else if (input.userMessage.length > 150) {
    score += 15
    reasons.push('messaggio medio')
  }

  // 2. File allegati
  if (fileCount >= 2) {
    score += 40
    reasons.push(`${fileCount} file allegati`)
  } else if (fileCount === 1) {
    score += 20
    reasons.push('file allegato')
  }

  // 3. Skill professionali attive
  if (skillCount > 0) {
    score += 15 * skillCount
    reasons.push(`${skillCount} skill attive`)
  }

  // 4. Lunghezza conversazione
  if (conversationLength > 20) {
    score += 25
    reasons.push('conversazione lunga')
  } else if (conversationLength > 10) {
    score += 10
    reasons.push('conversazione media')
  }

  // 5. Parole chiave opus
  const hasOpusKeyword = OPUS_KEYWORDS.some(k => msg.includes(k))
  if (hasOpusKeyword) {
    score += 45
    reasons.push('richiesta complessa')
  }

  // 6. Parole chiave sonnet
  const hasSonnetKeyword = SONNET_KEYWORDS.some(k => msg.includes(k))
  if (hasSonnetKeyword && !hasOpusKeyword) {
    score += 10
    reasons.push('richiesta strutturata')
  }

  // 7. Professione ad alta precisione
  if (input.professione && HIGH_PRECISION_PROFESSIONS.includes(input.professione)) {
    score += 15
    reasons.push(`professione: ${input.professione}`)
  }

  // 8. Testo file molto lungo
  const totalFileLength = input.fileContexts?.reduce((sum, f) => sum + (f.testo?.length || 0), 0) || 0
  if (totalFileLength > 20000) {
    score += 35
    reasons.push('documento molto lungo')
  } else if (totalFileLength > 5000) {
    score += 15
    reasons.push('documento lungo')
  }

  // --- SELEZIONE MODELLO ---
  let model: string
  let reason: string

  if (score >= 70) {
    model = 'claude-opus-4-8'
    reason = `Opus (score: ${score}) — ${reasons.join(', ')}`
  } else if (score >= 25) {
    model = 'claude-sonnet-4-6'
    reason = `Sonnet (score: ${score}) — ${reasons.join(', ')}`
  } else {
    model = 'claude-haiku-4-5-20251001'
    reason = `Haiku (score: ${score}) — risposta semplice`
  }

  return { model, reason, score }
}
