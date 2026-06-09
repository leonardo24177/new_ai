import Link from 'next/link'

const PROFESSIONI = [
  { emoji: '⚖️', label: 'Avvocati' },
  { emoji: '🧾', label: 'Commercialisti' },
  { emoji: '🏗️', label: 'Ingegneri' },
  { emoji: '🩺', label: 'Medici' },
  { emoji: '📐', label: 'Architetti' },
  { emoji: '🧠', label: 'Psicologi' },
]

const FEATURES = [
  {
    icon: '🎯',
    title: 'Personalizzato sulla tua professione',
    desc: 'L\'assistente conosce le tue fonti, il tuo settore e il tuo modo di lavorare. Non è un chatbot generico.',
  },
  {
    icon: '📂',
    title: 'Tre ambiti separati',
    desc: 'Lavoro, studio e uso personale sono contesti distinti. Fonti, skill e istruzioni non si mescolano.',
  },
  {
    icon: '✦',
    title: 'Skill specializzate',
    desc: 'Attiva modalità dedicate: redazione relazioni tecniche, ricerca giuridica, computo metrico, e altro.',
  },
  {
    icon: '📄',
    title: 'I tuoi documenti come contesto',
    desc: 'Carica PDF, Word, Excel o collega Google Drive. L\'assistente li usa come base per le risposte.',
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">

      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gray-900 flex items-center justify-center">
            <span className="text-white text-xs font-bold">AI</span>
          </div>
          <span className="font-semibold text-gray-900 text-sm">Assistente AI</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/come-funziona" className="text-sm text-gray-500 hover:text-gray-900 transition-colors hidden sm:block">
            Come funziona
          </Link>
          <Link href="/login" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            Accedi
          </Link>
          <Link href="/register" className="bg-gray-900 text-white text-sm px-4 py-2 rounded-xl hover:bg-gray-800 transition-colors">
            Inizia gratis
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 py-20 max-w-3xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-gray-100 text-gray-600 text-xs font-medium px-3 py-1.5 rounded-full mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
          Disponibile in Italia
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight mb-5">
          L&apos;assistente AI costruito<br className="hidden sm:block" /> per la tua professione
        </h1>
        <p className="text-gray-500 text-lg mb-10 leading-relaxed max-w-xl mx-auto">
          Non un chatbot generico. Un assistente che conosce le tue fonti, il tuo settore e lavora come lavori tu.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/register" className="bg-gray-900 text-white px-7 py-3.5 rounded-xl font-medium hover:bg-gray-800 transition-colors">
            Crea il tuo assistente
          </Link>
          <Link href="/login" className="border border-gray-200 text-gray-700 px-7 py-3.5 rounded-xl font-medium hover:border-gray-400 transition-colors">
            Hai già un account
          </Link>
        </div>
      </section>

      {/* Per chi è */}
      <section className="px-6 py-12 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <p className="text-center text-xs font-semibold text-gray-400 uppercase tracking-widest mb-6">
            Pensato per i professionisti italiani
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {PROFESSIONI.map(p => (
              <div key={p.label} className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 font-medium">
                <span>{p.emoji}</span>
                <span>{p.label}</span>
              </div>
            ))}
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-400">
              e altri...
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20 max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-12">
          Non è ChatGPT. È il tuo assistente.
        </h2>
        <div className="grid sm:grid-cols-2 gap-5">
          {FEATURES.map(f => (
            <div key={f.title} className="bg-white border border-gray-200 rounded-2xl p-6">
              <div className="text-2xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA finale */}
      <section className="px-6 py-20 bg-gray-900">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Pronto a iniziare?</h2>
          <p className="text-gray-400 text-sm mb-8">
            Configura il tuo assistente in pochi minuti. Nessuna carta di credito richiesta.
          </p>
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
            <Link href="/come-funziona" className="hover:text-gray-600 transition-colors">Come funziona</Link>
            <Link href="/privacy" className="hover:text-gray-600 transition-colors">Privacy Policy</Link>
            <Link href="/termini" className="hover:text-gray-600 transition-colors">Termini di Servizio</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
