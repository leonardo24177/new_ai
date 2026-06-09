export const metadata = {
  title: 'Termini di Servizio — Assistente AI',
  description: 'Termini e condizioni di utilizzo del servizio',
}

export default function TerminiPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <a href="/login" className="text-sm text-gray-500 hover:text-gray-700">← Torna al sito</a>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Termini di Servizio</h1>
        <p className="text-sm text-gray-500 mb-8">Ultimo aggiornamento: giugno 2025</p>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6 text-sm text-gray-700 leading-relaxed">

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">1. Il servizio</h2>
            <p>
              Assistente AI (<strong>assistente-ai.it</strong>) è un servizio SaaS che fornisce un assistente AI personalizzabile basato sui modelli Claude di Anthropic. Il servizio è destinato a professionisti italiani che desiderano automatizzare o supportare attività lavorative, di studio o personali.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">2. Accettazione</h2>
            <p>Creando un account accetti integralmente questi Termini e la nostra <a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a>. Se non li accetti, non puoi usare il servizio.</p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">3. Account</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Devi avere almeno 18 anni per registrarti.</li>
              <li>Sei responsabile della sicurezza delle tue credenziali.</li>
              <li>Un account è personale e non cedibile a terzi.</li>
              <li>Ci riserviamo di sospendere o eliminare account che violano questi termini.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">4. Uso consentito</h2>
            <p className="mb-2">Puoi usare il servizio per attività lecite. È vietato:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Caricare contenuti illegali, offensivi o che violano diritti di terzi.</li>
              <li>Tentare di aggirare limiti di utilizzo (rate limiting) o misure di sicurezza.</li>
              <li>Usare il servizio per generare contenuti ingannevoli, spam o materiale dannoso.</li>
              <li>Condividere l'accesso al proprio account con altri utenti.</li>
              <li>Usare il servizio per attività che violino le <a href="https://www.anthropic.com/legal/usage-policy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Usage Policy di Anthropic</a>.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">5. Contenuti e AI</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Le risposte dell'assistente sono generate da un modello AI e possono contenere errori. Non sostituiscono il parere di un professionista qualificato (avvocato, medico, commercialista, ecc.).</li>
              <li>Sei responsabile dei contenuti che carichi e dell'uso che fai delle risposte.</li>
              <li>I contenuti delle conversazioni vengono elaborati da Anthropic per generare le risposte (vedi Privacy Policy).</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">6. Disponibilità del servizio</h2>
            <p>Forniamo il servizio "così com'è" senza garanzie di uptime. Ci riserviamo di interrompere, modificare o sospendere il servizio in qualsiasi momento, con ragionevole preavviso ove possibile.</p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">7. Limitazione di responsabilità</h2>
            <p>Nei limiti consentiti dalla legge, non siamo responsabili per danni diretti o indiretti derivanti dall'uso del servizio, inclusi danni basati su risposte errate dell'AI o interruzioni del servizio.</p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">8. Legge applicabile</h2>
            <p>Questi termini sono regolati dalla legge italiana. Per qualsiasi controversia è competente il Foro di Milano, salvo diversa disposizione di legge inderogabile a tutela del consumatore.</p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">9. Contatti</h2>
            <p>Per qualsiasi domanda: <a href="mailto:info@assistente-ai.it" className="text-blue-600 hover:underline">info@assistente-ai.it</a></p>
          </section>

        </div>
      </div>
    </div>
  )
}
