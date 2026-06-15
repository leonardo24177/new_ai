'use client'
import { useState, useEffect, useCallback } from 'react'

type Pagina = 'chat' | 'profilo'

interface TourStep {
  titolo: string
  descrizione: string
  target?: string
}

const TOUR_CHAT: TourStep[] = [
  {
    titolo: 'Benvenuto!',
    descrizione: 'Ti guidiamo nelle funzioni principali in pochi passi. Puoi saltare in qualsiasi momento o rivedere il tour dalla guida.',
  },
  {
    titolo: 'Contesto attivo',
    descrizione: 'Se hai configurato più ambiti (Lavoro, Studio, Personale), da qui li cambi al volo. Ogni ambito ha file, istruzioni e conversazioni separati.',
    target: 'ambiti',
  },
  {
    titolo: 'Skill personalizzate',
    descrizione: 'Le skill sono istruzioni che specializzano il comportamento dell\'assistente. Attivane una per adattare le risposte al tuo caso d\'uso.',
    target: 'skill-selector',
  },
  {
    titolo: 'Allega un file',
    descrizione: 'Carica PDF, Word, Excel, PPTX o immagini. L\'assistente li legge e risponde in base al contenuto. Puoi anche incollare immagini dagli appunti.',
    target: 'file-upload',
  },
  {
    titolo: 'Scrivi e invia',
    descrizione: 'Scrivi il tuo messaggio e premi Invio (o il pulsante freccia). Usa il microfono per dettare o l\'altoparlante per ascoltare le risposte in audio.',
    target: 'input-area',
  },
  {
    titolo: 'Profilo',
    descrizione: 'Dal profilo carichi fonti permanenti, crei skill personalizzate, colleghi Google Drive e personalizzi le istruzioni base dell\'assistente.',
    target: 'profilo-btn',
  },
  {
    titolo: 'Questo pulsante è sempre qui',
    descrizione: 'Il tasto ? apre la guida in qualsiasi momento. Puoi rivedere il tour, cercare aiuto sulle singole funzioni o leggere la guida completa.',
    target: 'guide-btn',
  },
]

const TOUR_PROFILO: TourStep[] = [
  {
    titolo: 'Configura il tuo assistente',
    descrizione: 'Da qui personalizzi il comportamento dell\'assistente: ambiti, file permanenti, skill e istruzioni. Ti guidiamo tra le sezioni.',
  },
  {
    titolo: 'Tab Ambiti',
    descrizione: 'Ogni ambito (Lavoro, Studio, Personale) ha istruzioni aggiuntive e file separati che si attivano quando cambi contesto in chat.',
    target: 'tab-ambiti',
  },
  {
    titolo: 'Tab File',
    descrizione: 'I file caricati qui sono fonti permanenti: vengono iniettati automaticamente nel contesto di ogni conversazione dell\'ambito selezionato.',
    target: 'tab-file',
  },
  {
    titolo: 'Tab Prompt',
    descrizione: 'Il system prompt è il "carattere" base del tuo assistente, attivo in ogni conversazione. Puoi rigenerarlo con l\'AI o scriverlo manualmente.',
    target: 'tab-prompt',
  },
  {
    titolo: 'Tab Skill',
    descrizione: 'Crea skill personalizzate visibili solo a te. Massimo 10 skill, attivabili in qualsiasi ambito dalla barra in fondo alla chat.',
    target: 'tab-skill',
  },
  {
    titolo: 'Questo pulsante è sempre qui',
    descrizione: 'Il tasto ? apre la guida in qualsiasi momento. Puoi rivedere il tour, cercare aiuto sulle singole funzioni o leggere la guida completa.',
    target: 'guide-btn',
  },
]

const HELP_SEZIONI = [
  {
    titolo: 'Ambiti: Lavoro, Studio, Personale',
    corpo: 'Ogni ambito è un contesto separato con file, istruzioni e conversazioni distinti. Cambio rapido dal badge in alto nella chat.',
  },
  {
    titolo: 'Skill personalizzate',
    corpo: 'Le skill sono istruzioni riutilizzabili che modificano il comportamento dell\'assistente. Attivale dalla barra in basso in chat, o creane di nuove dal profilo (tab Skill) o dal pulsante + in coda alla lista.',
  },
  {
    titolo: 'File e documenti',
    corpo: 'Allega file alla chat (validi solo per quella conversazione) o caricali nel profilo come fonti permanenti. Formati: PDF, Word, Excel, PPTX, immagini (JPEG/PNG/WebP), testo e codice.',
  },
  {
    titolo: 'Condivisione conversazioni',
    corpo: 'Apri la sidebar e clicca l\'icona condividi accanto a una conversazione per generare un link pubblico. Puoi impostare scadenza e protezione con password.',
  },
  {
    titolo: 'Google Drive',
    corpo: 'Dal profilo puoi collegare Google Drive e selezionare le cartelle da usare come fonti. I file vengono iniettati automaticamente nel contesto ad ogni conversazione.',
  },
  {
    titolo: 'Selezione automatica del modello AI',
    corpo: 'L\'assistente sceglie automaticamente tra Haiku, Sonnet e Opus in base alla complessità della richiesta. Allegati e skill aumentano la potenza usata. Non è necessario configurare nulla.',
  },
]

export default function GuidePanel({ pagina }: { pagina: Pagina }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [espanso, setEspanso] = useState<number | null>(null)
  const [tourAttivo, setTourAttivo] = useState(false)
  const [tourStep, setTourStep] = useState(0)
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null)
  const [tourCompletato, setTourCompletato] = useState(false)

  const TOUR_KEY = `guidaTourFatta_${pagina}`
  const tourSteps = pagina === 'chat' ? TOUR_CHAT : TOUR_PROFILO

  const updateHighlight = useCallback((step: number) => {
    const target = tourSteps[step]?.target
    if (!target) { setHighlightRect(null); return }
    const el = document.querySelector(`[data-tour="${target}"]`)
    if (!el) { setHighlightRect(null); return }
    el.scrollIntoView({ behavior: 'instant', block: 'nearest', inline: 'nearest' })
    requestAnimationFrame(() => setHighlightRect(el.getBoundingClientRect()))
  }, [tourSteps])

  const saltaTour = useCallback(() => {
    setTourAttivo(false)
    setHighlightRect(null)
    setTourCompletato(true)
    localStorage.setItem(TOUR_KEY, '1')
  }, [TOUR_KEY])

  const avviaTour = useCallback(() => {
    setDrawerOpen(false)
    setTourStep(0)
    setHighlightRect(null)
    setTourAttivo(true)
  }, [])

  const nextStep = useCallback(() => {
    const next = tourStep + 1
    if (next >= tourSteps.length) { saltaTour(); return }
    setTourStep(next)
    updateHighlight(next)
  }, [tourStep, tourSteps.length, saltaTour, updateHighlight])

  const prevStep = useCallback(() => {
    if (tourStep <= 0) return
    const prev = tourStep - 1
    setTourStep(prev)
    updateHighlight(prev)
  }, [tourStep, updateHighlight])

  // Auto-avvio al primo accesso
  useEffect(() => {
    const done = !!localStorage.getItem(TOUR_KEY)
    setTourCompletato(done)
    if (!done) {
      const t = setTimeout(avviaTour, 900)
      return () => clearTimeout(t)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Escape per uscire dal tour
  useEffect(() => {
    if (!tourAttivo) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') saltaTour() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [tourAttivo, saltaTour])

  // Ricalcola highlight al resize
  useEffect(() => {
    if (!tourAttivo) return
    const handler = () => updateHighlight(tourStep)
    window.addEventListener('resize', handler, { passive: true })
    return () => window.removeEventListener('resize', handler)
  }, [tourAttivo, tourStep, updateHighlight])

  const step = tourSteps[tourStep]

  // Posizione tooltip
  let tooltipStyle: React.CSSProperties
  if (highlightRect) {
    const spaceBelow = window.innerHeight - highlightRect.bottom
    const spaceAbove = highlightRect.top
    const yDown = highlightRect.bottom + 12
    const yUp = window.innerHeight - highlightRect.top + 12
    if (spaceBelow >= 180 || spaceBelow >= spaceAbove) {
      tooltipStyle = { top: yDown, left: '50%', transform: 'translateX(-50%)', width: 'calc(100vw - 32px)', maxWidth: 360 }
    } else {
      tooltipStyle = { bottom: yUp, left: '50%', transform: 'translateX(-50%)', width: 'calc(100vw - 32px)', maxWidth: 360 }
    }
  } else {
    tooltipStyle = { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 'calc(100vw - 32px)', maxWidth: 360 }
  }

  return (
    <>
      {/* Pulsante ? */}
      <button
        data-tour="guide-btn"
        onClick={() => setDrawerOpen(true)}
        className="fixed z-40 w-9 h-9 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center text-gray-500 hover:text-gray-900 hover:shadow-lg transition-all text-sm font-bold select-none"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 72px)', right: '12px' }}
        aria-label="Apri guida"
      >
        ?
      </button>

      {/* Drawer */}
      {drawerOpen && (
        <>
          <div className="fixed inset-0 z-50 bg-black/30" onClick={() => setDrawerOpen(false)} />
          <div className="fixed right-0 top-0 bottom-0 z-[51] w-full max-w-sm bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
              <p className="text-sm font-semibold text-gray-900">Guida rapida</p>
              <button
                onClick={() => setDrawerOpen(false)}
                className="text-gray-400 hover:text-gray-600 w-7 h-7 flex items-center justify-center leading-none"
              >
                ✕
              </button>
            </div>

            <button
              onClick={avviaTour}
              className="mx-4 mt-4 mb-3 py-3 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 flex-shrink-0"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                <path d="M2 1.5L10.5 6L2 10.5V1.5Z" />
              </svg>
              {tourCompletato ? 'Rivedi il tour guidato' : 'Avvia il tour guidato'}
            </button>

            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1.5">
              {HELP_SEZIONI.map((s, i) => (
                <div key={i} className="border border-gray-100 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setEspanso(espanso === i ? null : i)}
                    className="w-full px-4 py-3 text-left flex items-center justify-between gap-2 text-sm font-medium text-gray-800 hover:bg-gray-50 transition-colors"
                  >
                    <span>{s.titolo}</span>
                    <span className="text-gray-400 text-[10px] flex-shrink-0">{espanso === i ? '▲' : '▼'}</span>
                  </button>
                  {espanso === i && (
                    <div className="px-4 pb-3 pt-2 text-sm text-gray-600 leading-relaxed border-t border-gray-50">
                      {s.corpo}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="px-4 py-3 border-t border-gray-100 flex-shrink-0">
              <a href="/come-funziona" className="text-xs text-blue-600 hover:underline">
                Leggi la guida completa →
              </a>
            </div>
          </div>
        </>
      )}

      {/* Tour overlay */}
      {tourAttivo && (
        <>
          {/* Click blocker (senza onClick — si esce solo con Salta/Fatto/Escape) */}
          <div
            className="fixed inset-0 z-[52]"
            style={{ background: highlightRect ? 'transparent' : 'rgba(0,0,0,0.55)' }}
          />

          {/* Spotlight con cutout */}
          {highlightRect && (
            <div
              className="fixed z-[53] rounded-xl pointer-events-none"
              style={{
                top: highlightRect.top - 6,
                left: highlightRect.left - 6,
                width: highlightRect.width + 12,
                height: highlightRect.height + 12,
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
                border: '2px solid rgba(255,255,255,0.75)',
              }}
            />
          )}

          {/* Tooltip */}
          <div className="fixed z-[54] bg-white rounded-2xl shadow-2xl p-5" style={tooltipStyle}>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs text-gray-400">{tourStep + 1} di {tourSteps.length}</span>
              <button onClick={saltaTour} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                Salta
              </button>
            </div>
            <p className="text-sm font-semibold text-gray-900 mb-1.5">{step?.titolo}</p>
            <p className="text-sm text-gray-600 leading-relaxed">{step?.descrizione}</p>
            <div className="flex gap-2 mt-4">
              {tourStep > 0 && (
                <button
                  onClick={prevStep}
                  className="flex-1 py-2.5 text-sm text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  ← Indietro
                </button>
              )}
              <button
                onClick={nextStep}
                className={`py-2.5 text-sm font-medium bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors ${tourStep > 0 ? 'flex-1' : 'w-full'}`}
              >
                {tourStep === tourSteps.length - 1 ? 'Fatto!' : 'Avanti →'}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
