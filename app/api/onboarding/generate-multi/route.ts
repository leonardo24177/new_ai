import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { MODELS } from '@/lib/model-pricing'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

function san(val: unknown, maxLen = 200): string {
  if (typeof val !== 'string') return ''
  return val.replace(/[\r\n]+/g, ' ').trim().slice(0, maxLen)
}

const REGOLA_FONTI_FORTE = `
REGOLA ASSOLUTA — DA APPLICARE PRIMA DI OGNI RISPOSTA:
Prima di rispondere a qualsiasi domanda che richieda fatti specifici, norme, sentenze, numeri, date, articoli di legge o riferimenti precisi, verifica mentalmente se hai accesso reale e verificato a quella fonte.

Se NON hai accesso verificato alla fonte, DEVI iniziare la risposta IMMEDIATAMENTE con questo avviso, prima di qualsiasi altro contenuto:

⚠️ FONTE NON VERIFICATA: Le informazioni seguenti NON provengono dalle tue fonti attendibili. Potrebbero contenere errori o imprecisioni. Verifica sempre prima di utilizzarle in ambito professionale.

REGOLE VINCOLANTI:
- NON fornire mai riferimenti a sentenze specifiche, articoli, circolari o dati precisi senza l'avviso se non provengono da fonti verificate
- È OBBLIGATORIO dire "non ho accesso verificato a questa fonte" piuttosto che inventare o dedurre informazioni specifiche
- La conoscenza generale di diritto, medicina, contabilità ecc. NON equivale ad avere accesso verificato a una fonte specifica
- Se l'utente non ti ha fornito il testo di un documento, NON puoi descriverne i dettagli come se li conoscessi
- Preferisci sempre la trasparenza sull'incertezza alla completezza apparente
`

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

    const { nome: nomeRaw, ambitiData, note_libere: noteRaw } = await req.json()
    const nome = san(nomeRaw, 100)
    const note_libere = san(noteRaw, 500)

    // ─── 1. GENERA system_prompt_base NEUTRO ──────────────────────────────────
    const basePromptRequest = `Crea un'identità base breve per l'assistente AI di ${nome}.

ISTRUZIONI CRITICHE:
- Massimo 80 parole
- Solo nome dell'utente, approccio comunicativo generale (diretto, efficiente, preciso)
- NESSUN riferimento a professione, lavoro, fonti legali, ambiti specifici
- NESSUNA sezione su "ambito professionale" o "ambito personale"
- In italiano, seconda persona (tu sei...)
- Inizia direttamente con "Sei l'assistente personale di ${nome}..."
- NON includere meta-commenti
${note_libere?.trim() ? `- Tieni conto di questa indicazione dell'utente: "${note_libere.trim()}"` : ''}

Identità base:`

    const baseMessage = await client.messages.create({
      model: MODELS.sonnet,
      max_tokens: 300,
      messages: [{ role: 'user', content: basePromptRequest }],
    })
    const system_prompt_base = baseMessage.content[0].type === 'text'
      ? baseMessage.content[0].text.trim()
      : `Sei l'assistente personale di ${nome}. Il tuo approccio è diretto, efficiente e senza fronzoli. Vai dritto al punto, usa liste e schemi per presentare informazioni. Adatta il registro al contesto dell'ambito attivo.`

    // ─── 2. GENERA system_prompt_extra PER OGNI AMBITO ───────────────────────
    const ambiti_prompts: string[] = []

    for (const ad of ambitiData) {
      const fontiFiltrate = ad.fonti?.filter((f: { id: string }) => !ad.fonti_escluse?.includes(f.id)) || []
      const gerarchia = fontiFiltrate.map((f: { label: string }, i: number) => `${i + 1}. ${f.label}`).join('\n')

      const specializzazioni = ad.specializzazioni?.length > 0
        ? ad.specializzazioni.join(', ')
        : ad.specializzazione || ''

      const specializzazioneCustom = ad.specializzazione_custom?.trim()
        ? `\nSpecializzazione aggiuntiva: ${ad.specializzazione_custom}`
        : ''

      let contestoAmbito = ''
      if (ad.ambito === 'lavoro') {
        contestoAmbito = `
Ambito: Lavoro professionale
Professione: ${san(ad.professione, 100)}
Utilizzo principale: ${san(ad.utilizzo, 100)}
${specializzazioni ? `Specializzazioni: ${san(specializzazioni, 200)}` : ''}${specializzazioneCustom}
${gerarchia ? `Gerarchia fonti attendibili:\n${gerarchia}` : ''}
${ad.fonti_escluse?.length > 0 ? `Fonti escluse: ${ad.fonti_escluse.join(', ')}` : ''}
Citazione fonti: ${san(ad.citazione, 50)}
In caso di conflitto tra fonti: ${san(ad.conflitto_fonti, 100)}
Tono: ${san(ad.tono, 50)}`
      } else if (ad.ambito === 'studio') {
        contestoAmbito = `
Ambito: Studio
${ad.materia_studio ? `Materia / Corso: ${san(ad.materia_studio, 100)}` : ''}
Livello: ${san(ad.livello_studio, 50)}
Tono: ${san(ad.tono, 50)}`
      } else if (ad.ambito === 'personale') {
        contestoAmbito = `
Ambito: Uso personale
Uso principale: ${san(ad.uso_personale, 100)}
Tono: ${san(ad.tono, 50)}`
      }

      const prompt = `Genera un blocco di istruzioni specifico per questo ambito di utilizzo dell'assistente AI per l'utente ${nome}.

${contestoAmbito}
${note_libere?.trim() ? `Note aggiuntive dell'utente: ${note_libere.trim()}` : ''}

ISTRUZIONI PER LA GENERAZIONE:
1. Il blocco deve essere in italiano
2. Massimo 250 parole
3. Scritto in seconda persona (tu sei... / in questo ambito...)
4. IMPORTANTE: questo blocco viene aggiunto AL SISTEMA BASE già esistente — NON ripetere l'identità generale
5. Concentrati SOLO sulle istruzioni specifiche per questo ambito
${ad.ambito === 'lavoro' ? `6. DEVI includere LETTERALMENTE questa sezione:\n\n--- INIZIO SEZIONE OBBLIGATORIA ---\n${REGOLA_FONTI_FORTE}\n--- FINE SEZIONE OBBLIGATORIA ---\n\n7. Includi la gerarchia delle fonti: ${gerarchia}` : ''}
${ad.ambito === 'lavoro' ? '8' : '6'}. NON includere meta-commenti — inizia direttamente con il contenuto

Genera il blocco:`

      const message = await client.messages.create({
        model: MODELS.sonnet,
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }],
      })

      const blocco = message.content[0].type === 'text' ? message.content[0].text : ''
      ambiti_prompts.push(blocco)
    }

    // ─── 3. RISPOSTA ─────────────────────────────────────────────────────────
    return NextResponse.json({
      system_prompt_base,   // → va in user_configs
      ambiti_prompts,       // → va in user_ambiti (system_prompt_extra)
      system_prompt: system_prompt_base, // retrocompatibilità
    })

  } catch (error) {
    console.error('Errore generazione multi:', error)
    return NextResponse.json({ error: 'Errore nella generazione' }, { status: 500 })
  }
}
