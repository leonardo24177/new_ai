import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
    }

    const data = await req.json()

    const {
      nome,
      ambito,
      professione,
      utilizzo,
      specializzazione,
      fonti,
      fonti_escluse,
      citazione,
      conflitto_fonti,
      tono,
      note_libere,
    } = data

    // Costruisce il contesto per la generazione
    const fontiFiltrate = fonti?.filter((f: { id: string }) => !fonti_escluse?.includes(f.id)) || []
    const gerarchia = fontiFiltrate.map((f: { label: string }, i: number) => `${i + 1}. ${f.label}`).join('\n')

    const prompt = `Sei un esperto di prompt engineering. Genera un system prompt professionale e preciso per un assistente AI personalizzato.

DATI DELL'UTENTE:
- Nome: ${nome}
- Ambito: ${ambito}
${professione ? `- Professione: ${professione}` : ''}
${utilizzo ? `- Utilizzo principale: ${utilizzo}` : ''}
${specializzazione ? `- Specializzazione: ${specializzazione}` : ''}
${gerarchia ? `- Gerarchia fonti attendibili:\n${gerarchia}` : ''}
${fonti_escluse?.length > 0 ? `- Fonti escluse: ${fonti_escluse.join(', ')}` : ''}
${citazione ? `- Citazione fonti: ${citazione}` : ''}
${conflitto_fonti ? `- In caso di conflitto tra fonti: ${conflitto_fonti}` : ''}
- Tono: ${tono}
${note_libere ? `- Note aggiuntive: ${note_libere}` : ''}

ISTRUZIONI PER LA GENERAZIONE:
1. Il system prompt deve essere in italiano
2. Deve definire chiaramente il ruolo e le competenze dell'assistente
3. Se ci sono fonti attendibili, deve includere SEMPRE questa istruzione esatta sulla segnalazione:
   "Quando fornisci un'informazione che NON proviene dalle fonti attendibili definite dall'utente, segnalalo SEMPRE in modo esplicito all'inizio della risposta con questo formato: ⚠️ FONTE NON VERIFICATA: Questa informazione non proviene dalle tue fonti attendibili. Verifica prima di utilizzarla."
4. Deve includere la gerarchia delle fonti se presente
5. Deve rispettare il tono scelto
6. Non deve essere troppo lungo — massimo 400 parole
7. Deve essere scritto in seconda persona (tu sei...)
8. NON includere meta-commenti come "Ecco il system prompt:" — inizia direttamente con il contenuto

Genera ora il system prompt:`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    })

    const system_prompt = message.content[0].type === 'text' ? message.content[0].text : ''

    return NextResponse.json({ system_prompt })
  } catch (error) {
    console.error('Errore generazione system prompt:', error)
    return NextResponse.json({ error: 'Errore nella generazione' }, { status: 500 })
  }
}
