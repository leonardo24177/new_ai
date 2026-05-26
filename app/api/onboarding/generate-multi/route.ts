import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  try {
    const { nome, ambitiData, note_libere } = await req.json()

    const ambiti_prompts: string[] = []

    // Genera un blocco di prompt per ogni ambito
    for (const ad of ambitiData) {
      const fontiFiltrate = ad.fonti?.filter((f: { id: string }) => !ad.fonti_escluse?.includes(f.id)) || []
      const gerarchia = fontiFiltrate.map((f: { label: string }, i: number) => `${i + 1}. ${f.label}`).join('\n')

      let contestoAmbito = ''
      if (ad.ambito === 'lavoro') {
        contestoAmbito = `
Ambito: Lavoro professionale
Professione: ${ad.professione}
Utilizzo principale: ${ad.utilizzo}
${ad.specializzazione ? `Specializzazione: ${ad.specializzazione}` : ''}
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

ISTRUZIONI:
1. Il blocco deve essere in italiano
2. Massimo 200 parole
3. Scritto in seconda persona (tu sei...)
4. ${gerarchia ? 'INCLUDI SEMPRE questa istruzione esatta: "Quando fornisci informazioni che NON provengono dalle fonti attendibili definite, segnalalo SEMPRE con: ⚠️ FONTE NON VERIFICATA: Questa informazione non proviene dalle tue fonti attendibili. Verifica prima di utilizzarla."' : ''}
5. NON includere meta-commenti - inizia direttamente con il contenuto

Genera il blocco:`

      const message = await client.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      })

      const blocco = message.content[0].type === 'text' ? message.content[0].text : ''
      ambiti_prompts.push(blocco)
    }

    // Genera il system prompt finale combinato
    const ambitiDesc = ambitiData.map((ad: { ambito: string }, i: number) => `[${ad.ambito.toUpperCase()}]\n${ambiti_prompts[i]}`).join('\n\n---\n\n')

    const finalPrompt = `Crea un system prompt coerente e unificato per un assistente AI personale per ${nome}.

L'assistente deve coprire questi ambiti:
${ambitiDesc}

${note_libere ? `Note aggiuntive dell'utente: ${note_libere}` : ''}

ISTRUZIONI:
1. Unifica i blocchi in un unico system prompt fluido e coerente
2. Mantieni tutte le istruzioni specifiche per ogni ambito
3. Massimo 600 parole
4. In italiano, seconda persona
5. NON includere meta-commenti - inizia direttamente

System prompt finale:`

    const finalMessage = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1500,
      messages: [{ role: 'user', content: finalPrompt }],
    })

    const system_prompt = finalMessage.content[0].type === 'text' ? finalMessage.content[0].text : ''

    return NextResponse.json({ system_prompt, ambiti_prompts })

  } catch (error) {
    console.error('Errore generazione multi:', error)
    return NextResponse.json({ error: 'Errore nella generazione' }, { status: 500 })
  }
}
