import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

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
    const { nome, ambitiData, note_libere } = await req.json()

    // ─── 1. system_prompt_base NEUTRO con info personali ─────────────────────
    // Raccoglie solo dati universali: nome, note libere, e dati personali se presenti
    const ambitoPersonale = ambitiData.find((ad: { ambito: string }) => ad.ambito === 'personale')

    const infoPersonali = ambitoPersonale ? [
      ambitoPersonale.interessi?.length > 0 ? `Interessi: ${ambitoPersonale.interessi.join(', ')}${ambitoPersonale.interessi_custom ? ', ' + ambitoPersonale.interessi_custom : ''}` : '',
      ambitoPersonale.obiettivi?.length > 0 ? `Obiettivi personali: ${ambitoPersonale.obiettivi.join(', ')}${ambitoPersonale.obiettivi_custom ? ', ' + ambitoPersonale.obiettivi_custom : ''}` : '',
      ambitoPersonale.stile_vita?.length > 0 ? `Stile di vita: ${ambitoPersonale.stile_vita.join(', ')}${ambitoPersonale.stile_vita_custom ? ', ' + ambitoPersonale.stile_vita_custom : ''}` : '',
    ].filter(Boolean).join('\n') : ''

    const basePromptRequest = `Crea l'identità base per l'assistente AI di ${nome}.

Informazioni disponibili su ${nome}:
${infoPersonali ? infoPersonali : 'Nessuna informazione personale fornita'}
${note_libere ? `Note aggiuntive: ${note_libere}` : ''}

ISTRUZIONI CRITICHE:
- Massimo 150 parole
- Includi nome e, se disponibili, cenni agli interessi/obiettivi personali
- NESSUN riferimento a professione, fonti legali, ambiti lavorativi
- NESSUNA sezione su "ambito professionale" o simili
- In italiano, seconda persona (tu sei...)
- Inizia con "Sei l'assistente personale di ${nome}..."
- NON includere meta-commenti

Identità base:`

    const baseMessage = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 400,
      messages: [{ role: 'user', content: basePromptRequest }],
    })
    const system_prompt_base = baseMessage.content[0].type === 'text'
      ? baseMessage.content[0].text.trim()
      : `Sei l'assistente personale di ${nome}. Il tuo approccio è diretto, efficiente e senza fronzoli. Adatta il registro al contesto dell'ambito attivo.`

    // ─── 2. system_prompt_extra PER OGNI AMBITO ──────────────────────────────
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
Professione: ${ad.professione}
Utilizzo principale: ${ad.utilizzo}
${specializzazioni ? `Specializzazioni: ${specializzazioni}` : ''}${specializzazioneCustom}
${gerarchia ? `Gerarchia fonti attendibili:\n${gerarchia}` : ''}
${ad.fonti_escluse?.length > 0 ? `Fonti escluse: ${ad.fonti_escluse.join(', ')}` : ''}
Citazione fonti: ${ad.citazione}
In caso di conflitto tra fonti: ${ad.conflitto_fonti}
Tono: ${ad.tono}`
      } else if (ad.ambito === 'studio') {
        contestoAmbito = `
Ambito: Studio
Livello: ${ad.livello_studio}
Tono: ${ad.tono}`
      } else if (ad.ambito === 'personale') {
        contestoAmbito = `
Ambito: Uso personale
Interessi: ${ad.interessi?.join(', ') || ''}${ad.interessi_custom ? ', ' + ad.interessi_custom : ''}
Obiettivi: ${ad.obiettivi?.join(', ') || ''}${ad.obiettivi_custom ? ', ' + ad.obiettivi_custom : ''}
Stile di vita: ${ad.stile_vita?.join(', ') || ''}${ad.stile_vita_custom ? ', ' + ad.stile_vita_custom : ''}
Uso principale: ${ad.uso_personale}
Tono: ${ad.tono}`
      }

      const prompt = `Genera un blocco di istruzioni specifico per questo ambito dell'assistente AI di ${nome}.

${contestoAmbito}

ISTRUZIONI:
1. In italiano, massimo 250 parole
2. Seconda persona (in questo ambito sei... / quando parli di...)
3. Questo blocco si aggiunge a un'identità base già esistente — NON ripetere nome o caratteristiche generali
4. Concentrati SOLO sulle istruzioni specifiche per questo ambito
${ad.ambito === 'lavoro' ? `5. INCLUDI LETTERALMENTE:\n\n${REGOLA_FONTI_FORTE}\n\n6. Includi la gerarchia fonti: ${gerarchia}` : ''}
${ad.ambito === 'personale' ? `5. Usa gli interessi e obiettivi per personalizzare come l'assistente deve supportare ${nome} in questo ambito` : ''}
- NON includere meta-commenti, inizia direttamente

Genera il blocco:`

      const message = await client.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }],
      })

      const blocco = message.content[0].type === 'text' ? message.content[0].text : ''
      ambiti_prompts.push(blocco)
    }

    return NextResponse.json({
      system_prompt_base,
      ambiti_prompts,
      system_prompt: system_prompt_base, // retrocompatibilità
    })

  } catch (error) {
    console.error('Errore generazione multi:', error)
    return NextResponse.json({ error: 'Errore nella generazione' }, { status: 500 })
  }
}
