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

    const ambiti_prompts: string[] = []

    for (const ad of ambitiData) {
      const fontiFiltrate = ad.fonti?.filter((f: { id: string }) => !ad.fonti_escluse?.includes(f.id)) || []
      const gerarchia = fontiFiltrate.map((f: { label: string }, i: number) => `${i + 1}. ${f.label}`).join('\n')

      // Gestione specializzazioni multiple
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
Uso principale: ${ad.uso_personale}
Tono: ${ad.tono}`
      }

      const prompt = `Genera un blocco di istruzioni specifico per questo ambito di utilizzo dell'assistente AI per l'utente ${nome}.

${contestoAmbito}

ISTRUZIONI PER LA GENERAZIONE:
1. Il blocco deve essere in italiano
2. Massimo 250 parole
3. Scritto in seconda persona (tu sei...)
4. DEVI includere LETTERALMENTE questa sezione nella risposta generata:

--- INIZIO SEZIONE OBBLIGATORIA ---
${REGOLA_FONTI_FORTE}
--- FINE SEZIONE OBBLIGATORIA ---

${gerarchia ? `5. Includi la gerarchia delle fonti: ${gerarchia}` : ''}
6. NON includere meta-commenti - inizia direttamente con il contenuto del ruolo

Genera il blocco:`

      const message = await client.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }],
      })

      const blocco = message.content[0].type === 'text' ? message.content[0].text : ''
      ambiti_prompts.push(blocco)
    }

    // Genera il system prompt finale combinato
    const ambitiDesc = ambitiData.map((ad: { ambito: string }, i: number) =>
      `[${ad.ambito.toUpperCase()}]\n${ambiti_prompts[i]}`
    ).join('\n\n---\n\n')

    const finalPrompt = `Crea un system prompt coerente e unificato per un assistente AI personale per ${nome}.

L'assistente deve coprire questi ambiti:
${ambitiDesc}

${note_libere ? `Note aggiuntive dell'utente: ${note_libere}` : ''}

ISTRUZIONI CRITICHE:
1. Unifica i blocchi in un unico system prompt fluido e coerente
2. Mantieni INTATTE tutte le regole sulle fonti non verificate — non riassumere, non semplificare
3. La sezione "REGOLA ASSOLUTA — DA APPLICARE PRIMA DI OGNI RISPOSTA" deve apparire COMPLETA nel prompt finale
4. Massimo 800 parole totali
5. In italiano, seconda persona
6. NON includere meta-commenti - inizia direttamente
7. DEVI includere LETTERALMENTE questa sezione nel prompt finale, subito dopo le regole sulle fonti:

RICONOSCIMENTO INDICAZIONI OPERATIVE:
Quando l'utente descrive nella chat qualcosa che potrebbe costituire un'indicazione operativa (un file da usare come riferimento, una fonte, una procedura, una preferenza di formato), prima di procedere chiedi conferma con: "Ho capito che vuoi che utilizzi [X] come [fonte / riferimento / punto di partenza]. È corretto?" Attendi la conferma prima di assumere l'indicazione come acquisita. Una sola domanda di conferma per turno.

System prompt finale:`

    const finalMessage = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2000,
      messages: [{ role: 'user', content: finalPrompt }],
    })

    const system_prompt = finalMessage.content[0].type === 'text' ? finalMessage.content[0].text : ''

    return NextResponse.json({ system_prompt, ambiti_prompts })

  } catch (error) {
    console.error('Errore generazione multi:', error)
    return NextResponse.json({ error: 'Errore nella generazione' }, { status: 500 })
  }
}
