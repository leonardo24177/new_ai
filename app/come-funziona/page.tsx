import Link from 'next/link'

const STEPS = [
  {
    numero: '01',
    titolo: 'Crea il tuo account',
    desc: 'Registrati con email e password. L\'accesso è gratuito durante la fase beta.',
    dettagli: [
      'Nessuna carta di credito richiesta',
      'Dati protetti e conservati in Europa (Supabase EU)',
      'Puoi eliminare il tuo account in qualsiasi momento',
    ],
  },
  {
    numero: '02',
    titolo: 'Configura il tuo assistente',
    desc: 'Un breve onboarding guidato adatta l\'assistente alla tua professione e al tuo modo di lavorare.',
    dettagli: [
      'Scegli la tua professione (avvocato, commercialista, ingegnere...)',
      'Imposta il tono — formale, diretto, analitico',
      'Configura fino a tre ambiti separati: lavoro, studio, personale',
    ],
  },
  {
    numero: '03',
    titolo: 'Aggiungi le tue fonti',
    desc: 'L\'assistente impara dai tuoi documenti e li usa come base per le risposte.',
    dettagli: [
      'Carica PDF, Word (.docx), Excel (.xlsx, .xls), PowerPoint (.pptx)',
      'Aggiungi link a pagine web che vuoi tenere come riferimento',
      'Collega cartelle Google Drive per accesso automatico ai tuoi file',
      'PDF scansionati: testo estratto automaticamente con AI',
    ],
  },
  {
    numero: '04',
    titolo: 'Chatta e ottieni risposte precise',
    desc: 'L\'assistente conosce il tuo contesto e risponde in modo pertinente alla tua professione.',
    dettagli: [
      'Passa tra ambiti (lavoro / studio / personale) in un clic',
      'Attiva skill specializzate: redazione relazioni, analisi normativa, riepilogo...',
      'Allega file direttamente in chat, incolla immagini o trascinale nella finestra',
      'Cronologia conversazioni salvata e sempre accessibile',
    ],
  },
]

const FAQ = [
  {
    q: 'I miei documenti sono al sicuro?',
    r: 'Sì. I file sono salvati su Supabase (infrastruttura EU) e accessibili solo al tuo account. Non vengono usati per addestrare modelli AI.',
  },
  {
    q: 'Che modello AI usa?',
    r: 'Claude di Anthropic — uno dei modelli più avanzati disponibili. Il sistema sceglie automaticamente tra Haiku, Sonnet e Opus in base alla complessità della richiesta.',
  },
  {
    q: 'Posso usarlo su mobile?',
    r: 'Sì, l\'interfaccia è ottimizzata per smartphone e tablet. Funziona direttamente dal browser, senza installare app.',
  },
  {
    q: 'C\'è un limite di utilizzo?',
    r: 'Durante la beta: massimo 60 messaggi all\'ora e un tetto di costo mensile per utente. Limiti soggetti a variazione.',
  },
]

export default function ComeFunzionaPage() {
  return (
    <div className="min-h-screen bg-white">

      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto border-b border-gray-100">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gray-900 flex items-center justify-center">
            <span className="text-white text-xs font-bold">AI</span>
          </div>
          <span className="font-semibold text-gray-900 text-sm">Assistente AI</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            Accedi
          </Link>
          <Link href="/register" className="bg-gray-900 text-white text-sm px-4 py-2 rounded-xl hover:bg-gray-800 transition-colors">
            Inizia gratis
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 py-16 max-w-3xl mx-auto text-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Come funziona</h1>
        <p className="text-gray-500 text-lg leading-relaxed">
          Quattro passi per avere un assistente AI che conosce davvero il tuo lavoro.
        </p>
      </section>

      {/* Steps */}
      <section className="px-6 pb-20 max-w-3xl mx-auto">
        <div className="space-y-6">
          {STEPS.map((step, i) => (
            <div key={step.numero} className="flex gap-6">
              <div className="flex-shrink-0 flex flex-col items-center">
                <div className="w-10 h-10 rounded-2xl bg-gray-900 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">{step.numero}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="w-px flex-1 bg-gray-200 mt-3" />
                )}
              </div>
              <div className="pb-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">{step.titolo}</h2>
                <p className="text-gray-500 text-sm mb-4 leading-relaxed">{step.desc}</p>
                <ul className="space-y-1.5">
                  {step.dettagli.map(d => (
                    <li key={d} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="text-gray-300 mt-0.5">—</span>
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 py-16 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl font-bold text-gray-900 mb-8 text-center">Domande frequenti</h2>
          <div className="space-y-4">
            {FAQ.map(item => (
              <div key={item.q} className="bg-white rounded-2xl border border-gray-200 p-5">
                <p className="font-medium text-gray-900 mb-2 text-sm">{item.q}</p>
                <p className="text-sm text-gray-500 leading-relaxed">{item.r}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-16 bg-gray-900">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-xl font-bold text-white mb-3">Pronto a iniziare?</h2>
          <p className="text-gray-400 text-sm mb-7">Configura il tuo assistente in pochi minuti.</p>
          <Link href="/register" className="bg-white text-gray-900 px-7 py-3.5 rounded-xl font-medium hover:bg-gray-100 transition-colors inline-block">
            Crea il tuo assistente
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-gray-100">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400">
          <span>© 2025 Assistente AI — assistente-ai.it</span>
          <div className="flex gap-5">
            <Link href="/privacy" className="hover:text-gray-600 transition-colors">Privacy Policy</Link>
            <Link href="/termini" className="hover:text-gray-600 transition-colors">Termini di Servizio</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
