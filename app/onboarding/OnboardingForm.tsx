'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  OnboardingData,
  Fonte,
  UTILIZZI,
  SPECIALIZZAZIONI,
  getFontiDefault,
  type Professione,
  type Ambito,
} from '@/lib/onboarding/config'

// Dati per un singolo ambito
interface AmbitoData {
  ambito: Ambito
  professione: string
  utilizzo: string
  specializzazione: string
  fonti: Fonte[]
  fonti_escluse: string[]
  citazione: 'sempre' | 'essenziale' | 'mai'
  conflitto_fonti: 'gerarchia' | 'entrambe' | 'chiedi'
  tono: 'formale' | 'diretto' | 'colloquiale'
  livello_studio: string
  uso_personale: string
}

function defaultAmbitoData(ambito: Ambito): AmbitoData {
  return {
    ambito,
    professione: '',
    utilizzo: '',
    specializzazione: '',
    fonti: [],
    fonti_escluse: [],
    citazione: 'sempre',
    conflitto_fonti: 'gerarchia',
    tono: 'formale',
    livello_studio: '',
    uso_personale: '',
  }
}

const PROFESSIONI = [
  { value: 'avvocato', label: 'Avvocato', emoji: '⚖️' },
  { value: 'commercialista', label: 'Commercialista', emoji: '📊' },
  { value: 'medico', label: 'Medico', emoji: '🏥' },
  { value: 'insegnante', label: 'Insegnante', emoji: '📚' },
  { value: 'architetto', label: 'Architetto', emoji: '📐' },
  { value: 'imprenditore', label: 'Imprenditore', emoji: '💼' },
  { value: 'altro', label: 'Altro', emoji: '👤' },
]

const STUDI = [
  { value: 'universita', label: 'Università' },
  { value: 'liceo', label: 'Liceo' },
  { value: 'media', label: 'Scuola media' },
  { value: 'professionale', label: 'Formazione professionale' },
]

const TONI = [
  { value: 'formale', label: 'Formale e preciso', desc: 'Linguaggio tecnico, terminologia specifica' },
  { value: 'diretto', label: 'Diretto e conciso', desc: 'Risposte brevi, al punto' },
  { value: 'colloquiale', label: 'Colloquiale e semplice', desc: 'Linguaggio accessibile, esempi pratici' },
]

const AMBITI_CONFIG = [
  { value: 'lavoro' as Ambito, label: 'Lavoro', emoji: '💼' },
  { value: 'studio' as Ambito, label: 'Studio', emoji: '📖' },
  { value: 'personale' as Ambito, label: 'Uso personale', emoji: '🏠' },
]

// Calcola gli step interni per un ambito
function getStepsForAmbito(a: AmbitoData): string[] {
  if (a.ambito === 'lavoro') {
    const key = `${a.professione}_${a.utilizzo}`
    const hasSpe = SPECIALIZZAZIONI[key]?.length > 0
    const steps = ['professione', 'utilizzo']
    if (hasSpe) steps.push('specializzazione')
    steps.push('fonti', 'citazione', 'conflitto_tono')
    return steps
  }
  if (a.ambito === 'studio') return ['livello', 'tono']
  if (a.ambito === 'personale') return ['uso', 'tono']
  return []
}

export default function OnboardingForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  // Step globale
  // 'nome' | 'ambiti' | { ambitoIndex, stepIndex } | 'note'
  type GlobalStep =
    | { phase: 'nome' }
    | { phase: 'ambiti' }
    | { phase: 'ambito'; ambitoIndex: number; stepIndex: number }
    | { phase: 'note' }

  const [globalStep, setGlobalStep] = useState<GlobalStep>({ phase: 'nome' })
  const [nome, setNome] = useState('')
  const [ambitiSelezionati, setAmbitiSelezionati] = useState<Ambito[]>([])
  const [ambitiData, setAmbitiData] = useState<AmbitoData[]>([])
  const [noteLibere, setNoteLibere] = useState('')

  function toggleAmbito(a: Ambito) {
    setAmbitiSelezionati(prev =>
      prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]
    )
  }

  function updateAmbitoData(index: number, field: keyof AmbitoData, value: unknown) {
    setAmbitiData(prev => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  // Aggiorna fonti quando cambia professione/utilizzo/specializzazione
  useEffect(() => {
    if (globalStep.phase !== 'ambito') return
    const { ambitoIndex } = globalStep
    const ad = ambitiData[ambitoIndex]
    if (!ad || ad.ambito !== 'lavoro') return
    if (ad.professione && ad.utilizzo) {
      const fonti = getFontiDefault(ad.professione, ad.utilizzo, ad.specializzazione)
      if (fonti.length > 0) {
        updateAmbitoData(ambitoIndex, 'fonti', fonti)
      }
    }
  }, [
    globalStep.phase === 'ambito' ? ambitiData[(globalStep as { phase: 'ambito'; ambitoIndex: number; stepIndex: number }).ambitoIndex]?.professione : null,
    globalStep.phase === 'ambito' ? ambitiData[(globalStep as { phase: 'ambito'; ambitoIndex: number; stepIndex: number }).ambitoIndex]?.utilizzo : null,
    globalStep.phase === 'ambito' ? ambitiData[(globalStep as { phase: 'ambito'; ambitoIndex: number; stepIndex: number }).ambitoIndex]?.specializzazione : null,
  ])

  function startAmbitiFlow() {
    const data = ambitiSelezionati.map(defaultAmbitoData)
    setAmbitiData(data)
    setGlobalStep({ phase: 'ambito', ambitoIndex: 0, stepIndex: 0 })
  }

  function nextStep() {
    if (globalStep.phase !== 'ambito') return
    const { ambitoIndex, stepIndex } = globalStep
    const ad = ambitiData[ambitoIndex]
    const steps = getStepsForAmbito(ad)

    if (stepIndex < steps.length - 1) {
      setGlobalStep({ phase: 'ambito', ambitoIndex, stepIndex: stepIndex + 1 })
    } else if (ambitoIndex < ambitiData.length - 1) {
      setGlobalStep({ phase: 'ambito', ambitoIndex: ambitoIndex + 1, stepIndex: 0 })
    } else {
      setGlobalStep({ phase: 'note' })
    }
  }

  function prevStep() {
    if (globalStep.phase === 'nome') return
    if (globalStep.phase === 'ambiti') { setGlobalStep({ phase: 'nome' }); return }
    if (globalStep.phase === 'note') {
      const lastAmbitoIndex = ambitiData.length - 1
      const lastStepIndex = getStepsForAmbito(ambitiData[lastAmbitoIndex]).length - 1
      setGlobalStep({ phase: 'ambito', ambitoIndex: lastAmbitoIndex, stepIndex: lastStepIndex })
      return
    }
    if (globalStep.phase === 'ambito') {
      const { ambitoIndex, stepIndex } = globalStep
      if (stepIndex > 0) {
        setGlobalStep({ phase: 'ambito', ambitoIndex, stepIndex: stepIndex - 1 })
      } else if (ambitoIndex > 0) {
        const prevAmbitoIndex = ambitoIndex - 1
        const prevSteps = getStepsForAmbito(ambitiData[prevAmbitoIndex])
        setGlobalStep({ phase: 'ambito', ambitoIndex: prevAmbitoIndex, stepIndex: prevSteps.length - 1 })
      } else {
        setGlobalStep({ phase: 'ambiti' })
      }
    }
  }

  // Calcola progresso totale
  function calcProgress() {
    let total = 2 // nome + ambiti
    ambitiSelezionati.forEach((a, i) => {
      const ad = ambitiData[i] || defaultAmbitoData(a)
      total += getStepsForAmbito(ad).length
    })
    total += 1 // note

    let current = 0
    if (globalStep.phase === 'nome') current = 1
    else if (globalStep.phase === 'ambiti') current = 2
    else if (globalStep.phase === 'ambito') {
      current = 2
      for (let i = 0; i < globalStep.ambitoIndex; i++) {
        current += getStepsForAmbito(ambitiData[i]).length
      }
      current += globalStep.stepIndex + 1
    } else {
      current = total
    }

    return { current, total }
  }

  // Drag & drop fonti
  function onDragStart(index: number) { setDragIndex(index) }
  function onDragOver(e: React.DragEvent, index: number, ambitoIndex: number) {
    e.preventDefault()
    if (dragIndex === null || dragIndex === index) return
    const newFonti = [...ambitiData[ambitoIndex].fonti]
    const [moved] = newFonti.splice(dragIndex, 1)
    newFonti.splice(index, 0, moved)
    updateAmbitoData(ambitoIndex, 'fonti', newFonti)
    setDragIndex(index)
  }
  function onDragEnd() { setDragIndex(null) }

  function toggleEscludi(ambitoIndex: number, fonteId: string) {
    const prev = ambitiData[ambitoIndex].fonti_escluse
    updateAmbitoData(ambitoIndex, 'fonti_escluse',
      prev.includes(fonteId) ? prev.filter(f => f !== fonteId) : [...prev, fonteId]
    )
  }

  async function generateAndSave() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/onboarding/generate-multi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, ambitiData, note_libere: noteLibere }),
      })

      if (!res.ok) throw new Error(`Errore API: ${res.status}`)
      const json = await res.json()

      if (!json.system_prompt) throw new Error('System prompt vuoto')

      const supabase = createClient()
      const { data: authData } = await supabase.auth.getUser()
      const user = authData?.user
      if (!user) throw new Error('Utente non autenticato')

      // Salva config principale
      const { error: upsertError } = await supabase
        .from('user_configs')
        .upsert({
          user_id: user.id,
          system_prompt_base: json.system_prompt,
          nome_assistente: 'Assistente',
          lingua: 'it',
        }, { onConflict: 'user_id' })

      if (upsertError) throw new Error(`Errore salvataggio: ${upsertError.message}`)

      // Salva dati per ambito
      for (let i = 0; i < ambitiData.length; i++) {
        const ad = ambitiData[i]
        await supabase
          .from('user_ambiti')
          .upsert({
            user_id: user.id,
            ambito: ad.ambito,
            onboarding_data: ad,
            system_prompt_extra: json.ambiti_prompts?.[i] || '',
          }, { onConflict: 'user_id,ambito' })
      }

      router.push('/chat')
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Errore sconosciuto')
    } finally {
      setLoading(false)
    }
  }

  const { current, total } = calcProgress()

  // Render step corrente
  function renderStep() {
    // NOME
    if (globalStep.phase === 'nome') {
      return (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Come ti chiami?</h2>
          <p className="text-gray-500 text-sm mb-6">Il tuo assistente userà il tuo nome</p>
          <input
            type="text"
            value={nome}
            onChange={e => setNome(e.target.value)}
            placeholder="Il tuo nome"
            autoFocus
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
            onKeyDown={e => e.key === 'Enter' && nome.trim() && setGlobalStep({ phase: 'ambiti' })}
          />
        </div>
      )
    }

    // AMBITI
    if (globalStep.phase === 'ambiti') {
      return (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-1">In che ambiti usi l&apos;assistente?</h2>
          <p className="text-gray-500 text-sm mb-6">Puoi selezionarne più di uno</p>
          <div className="space-y-3">
            {AMBITI_CONFIG.map(a => (
              <button
                key={a.value}
                onClick={() => toggleAmbito(a.value)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border text-sm font-medium transition-all ${
                  ambitiSelezionati.includes(a.value)
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-200 hover:border-gray-400 text-gray-700'
                }`}
              >
                <span className="text-xl">{a.emoji}</span>
                <span className="flex-1 text-left">{a.label}</span>
                {ambitiSelezionati.includes(a.value) && <span className="text-sm">✓</span>}
              </button>
            ))}
          </div>
        </div>
      )
    }

    // NOTE FINALI
    if (globalStep.phase === 'note') {
      return (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Qualcosa che devo sapere?</h2>
          <p className="text-gray-500 text-sm mb-6">Informazioni aggiuntive per il tuo assistente (opzionale)</p>
          <textarea
            value={noteLibere}
            onChange={e => setNoteLibere(e.target.value)}
            placeholder="Es. Preferisco risposte concise, lavoro principalmente in ambito internazionale..."
            rows={5}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
          />
        </div>
      )
    }

    // STEP AMBITO
    if (globalStep.phase === 'ambito') {
      const { ambitoIndex, stepIndex } = globalStep
      const ad = ambitiData[ambitoIndex]
      if (!ad) return null
      const steps = getStepsForAmbito(ad)
      const currentStepName = steps[stepIndex]
      const ambitoLabel = AMBITI_CONFIG.find(a => a.value === ad.ambito)?.label || ad.ambito

      return (
        <div>
          <div className="inline-flex items-center gap-1.5 bg-gray-100 rounded-full px-3 py-1 mb-4">
            <span className="text-xs text-gray-500">
              {AMBITI_CONFIG.find(a => a.value === ad.ambito)?.emoji}
            </span>
            <span className="text-xs font-medium text-gray-600">{ambitoLabel}</span>
          </div>

          {/* PROFESSIONE */}
          {currentStepName === 'professione' && (
            <>
              <h2 className="text-xl font-semibold text-gray-900 mb-1">Che professione hai?</h2>
              <p className="text-gray-500 text-sm mb-6">Personalizzeremo le fonti in base al tuo settore</p>
              <div className="grid grid-cols-2 gap-3">
                {PROFESSIONI.map(p => (
                  <button
                    key={p.value}
                    onClick={() => {
                      updateAmbitoData(ambitoIndex, 'professione', p.value)
                      updateAmbitoData(ambitoIndex, 'utilizzo', '')
                      updateAmbitoData(ambitoIndex, 'specializzazione', '')
                      nextStep()
                    }}
                    className={`flex flex-col items-center gap-2 px-4 py-4 rounded-xl border text-sm font-medium transition-all ${
                      ad.professione === p.value
                        ? 'border-gray-900 bg-gray-900 text-white'
                        : 'border-gray-200 hover:border-gray-400 text-gray-700'
                    }`}
                  >
                    <span className="text-2xl">{p.emoji}</span>
                    {p.label}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* UTILIZZO */}
          {currentStepName === 'utilizzo' && ad.professione && (
            <>
              <h2 className="text-xl font-semibold text-gray-900 mb-1">Per quale utilizzo principale?</h2>
              <p className="text-gray-500 text-sm mb-6">Come vuoi usare l&apos;assistente nel tuo lavoro</p>
              <div className="space-y-3">
                {UTILIZZI[ad.professione as Professione]?.map(u => (
                  <button
                    key={u.value}
                    onClick={() => {
                      updateAmbitoData(ambitoIndex, 'utilizzo', u.value)
                      updateAmbitoData(ambitoIndex, 'specializzazione', '')
                      nextStep()
                    }}
                    className={`w-full px-4 py-3.5 rounded-xl border text-sm font-medium text-left transition-all ${
                      ad.utilizzo === u.value
                        ? 'border-gray-900 bg-gray-900 text-white'
                        : 'border-gray-200 hover:border-gray-400 text-gray-700'
                    }`}
                  >
                    {u.label}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* SPECIALIZZAZIONE */}
          {currentStepName === 'specializzazione' && (
            <>
              <h2 className="text-xl font-semibold text-gray-900 mb-1">Specializzazione</h2>
              <p className="text-gray-500 text-sm mb-6">Seleziona l&apos;area specifica</p>
              <div className="space-y-3">
                {SPECIALIZZAZIONI[`${ad.professione}_${ad.utilizzo}`]?.map(s => (
                  <button
                    key={s.value}
                    onClick={() => { updateAmbitoData(ambitoIndex, 'specializzazione', s.value); nextStep() }}
                    className={`w-full px-4 py-3.5 rounded-xl border text-sm font-medium text-left transition-all ${
                      ad.specializzazione === s.value
                        ? 'border-gray-900 bg-gray-900 text-white'
                        : 'border-gray-200 hover:border-gray-400 text-gray-700'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* FONTI */}
          {currentStepName === 'fonti' && (
            <>
              <h2 className="text-xl font-semibold text-gray-900 mb-1">Gerarchia delle fonti</h2>
              <p className="text-gray-500 text-sm mb-2">Trascina per riordinare. La fonte in cima ha la massima priorità.</p>
              <p className="text-xs text-gray-400 mb-5">Puoi escludere le fonti che non vuoi usare</p>
              {ad.fonti.length === 0 ? (
                <p className="text-gray-400 text-sm italic">Nessuna fonte predefinita trovata.</p>
              ) : (
                <div className="space-y-2">
                  {ad.fonti.map((fonte, index) => (
                    <div
                      key={fonte.id}
                      draggable
                      onDragStart={() => onDragStart(index)}
                      onDragOver={e => onDragOver(e, index, ambitoIndex)}
                      onDragEnd={onDragEnd}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-grab transition-all ${
                        dragIndex === index ? 'opacity-50 scale-95' : ''
                      } ${ad.fonti_escluse.includes(fonte.id) ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                    >
                      <span className="text-gray-300 text-sm font-mono select-none">{index + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${ad.fonti_escluse.includes(fonte.id) ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                          {fonte.label}
                        </p>
                        {fonte.descrizione && <p className="text-xs text-gray-400 truncate">{fonte.descrizione}</p>}
                      </div>
                      <button
                        onClick={() => toggleEscludi(ambitoIndex, fonte.id)}
                        className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${
                          ad.fonti_escluse.includes(fonte.id)
                            ? 'bg-red-100 text-red-600 hover:bg-red-200'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {ad.fonti_escluse.includes(fonte.id) ? 'Ripristina' : 'Escludi'}
                      </button>
                      <span className="text-gray-300">⠿</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* CITAZIONE */}
          {currentStepName === 'citazione' && (
            <>
              <h2 className="text-xl font-semibold text-gray-900 mb-1">Come vuoi le citazioni?</h2>
              <p className="text-gray-500 text-sm mb-6">Come deve citare le fonti il tuo assistente</p>
              <div className="space-y-3">
                {[
                  { value: 'sempre', label: 'Sempre con riferimento preciso', desc: 'Art., comma, sentenza n., circolare n.' },
                  { value: 'essenziale', label: 'Solo quando essenziale', desc: 'Solo per affermazioni critiche' },
                  { value: 'mai', label: 'Mai — solo contenuto', desc: 'Risposte fluide senza riferimenti' },
                ].map(c => (
                  <button
                    key={c.value}
                    onClick={() => { updateAmbitoData(ambitoIndex, 'citazione', c.value); nextStep() }}
                    className={`w-full px-4 py-3.5 rounded-xl border text-left transition-all ${
                      ad.citazione === c.value
                        ? 'border-gray-900 bg-gray-900 text-white'
                        : 'border-gray-200 hover:border-gray-400 text-gray-700'
                    }`}
                  >
                    <p className="text-sm font-medium">{c.label}</p>
                    <p className={`text-xs mt-0.5 ${ad.citazione === c.value ? 'text-gray-300' : 'text-gray-400'}`}>{c.desc}</p>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* CONFLITTO + TONO */}
          {currentStepName === 'conflitto_tono' && (
            <>
              <h2 className="text-xl font-semibold text-gray-900 mb-1">In caso di conflitto tra fonti</h2>
              <p className="text-gray-500 text-sm mb-4">Cosa deve fare l&apos;assistente</p>
              <div className="space-y-3 mb-6">
                {[
                  { value: 'gerarchia', label: 'Segui la gerarchia impostata', desc: 'Prevale la fonte con priorità maggiore' },
                  { value: 'entrambe', label: 'Presenta entrambe le posizioni', desc: 'Mostra le diverse interpretazioni' },
                  { value: 'chiedi', label: 'Chiedimi come procedere', desc: 'Si ferma e chiede istruzioni' },
                ].map(c => (
                  <button
                    key={c.value}
                    onClick={() => updateAmbitoData(ambitoIndex, 'conflitto_fonti', c.value)}
                    className={`w-full px-4 py-3.5 rounded-xl border text-left transition-all ${
                      ad.conflitto_fonti === c.value
                        ? 'border-gray-900 bg-gray-900 text-white'
                        : 'border-gray-200 hover:border-gray-400 text-gray-700'
                    }`}
                  >
                    <p className="text-sm font-medium">{c.label}</p>
                    <p className={`text-xs mt-0.5 ${ad.conflitto_fonti === c.value ? 'text-gray-300' : 'text-gray-400'}`}>{c.desc}</p>
                  </button>
                ))}
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-3">Tono preferito</h3>
              <div className="space-y-2">
                {TONI.map(t => (
                  <button
                    key={t.value}
                    onClick={() => updateAmbitoData(ambitoIndex, 'tono', t.value)}
                    className={`w-full px-4 py-3 rounded-xl border text-left transition-all ${
                      ad.tono === t.value
                        ? 'border-gray-900 bg-gray-900 text-white'
                        : 'border-gray-200 hover:border-gray-400 text-gray-700'
                    }`}
                  >
                    <p className="text-sm font-medium">{t.label}</p>
                    <p className={`text-xs mt-0.5 ${ad.tono === t.value ? 'text-gray-300' : 'text-gray-400'}`}>{t.desc}</p>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* LIVELLO STUDIO */}
          {currentStepName === 'livello' && (
            <>
              <h2 className="text-xl font-semibold text-gray-900 mb-1">Che livello scolastico?</h2>
              <p className="text-gray-500 text-sm mb-6">Adatteremo il linguaggio al tuo contesto</p>
              <div className="space-y-3">
                {STUDI.map(s => (
                  <button
                    key={s.value}
                    onClick={() => { updateAmbitoData(ambitoIndex, 'livello_studio', s.value); nextStep() }}
                    className={`w-full px-4 py-3.5 rounded-xl border text-sm font-medium text-left transition-all ${
                      ad.livello_studio === s.value
                        ? 'border-gray-900 bg-gray-900 text-white'
                        : 'border-gray-200 hover:border-gray-400 text-gray-700'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* USO PERSONALE */}
          {currentStepName === 'uso' && (
            <>
              <h2 className="text-xl font-semibold text-gray-900 mb-1">Per cosa lo usi principalmente?</h2>
              <p className="text-gray-500 text-sm mb-6">Scegli l&apos;uso principale</p>
              <div className="space-y-3">
                {['Organizzazione', 'Scrittura', 'Ricerca', 'Hobby', 'Benessere'].map(u => (
                  <button
                    key={u}
                    onClick={() => { updateAmbitoData(ambitoIndex, 'uso_personale', u.toLowerCase()); nextStep() }}
                    className={`w-full px-4 py-3.5 rounded-xl border text-sm font-medium text-left transition-all ${
                      ad.uso_personale === u.toLowerCase()
                        ? 'border-gray-900 bg-gray-900 text-white'
                        : 'border-gray-200 hover:border-gray-400 text-gray-700'
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* TONO (studio/personale) */}
          {currentStepName === 'tono' && (
            <>
              <h2 className="text-xl font-semibold text-gray-900 mb-1">Che tono preferisci?</h2>
              <p className="text-gray-500 text-sm mb-6">Come vuoi che ti risponda l&apos;assistente</p>
              <div className="space-y-3">
                {TONI.map(t => (
                  <button
                    key={t.value}
                    onClick={() => { updateAmbitoData(ambitoIndex, 'tono', t.value); nextStep() }}
                    className={`w-full px-4 py-3.5 rounded-xl border text-left transition-all ${
                      ad.tono === t.value
                        ? 'border-gray-900 bg-gray-900 text-white'
                        : 'border-gray-200 hover:border-gray-400 text-gray-700'
                    }`}
                  >
                    <p className="text-sm font-medium">{t.label}</p>
                    <p className={`text-xs mt-0.5 ${ad.tono === t.value ? 'text-gray-300' : 'text-gray-400'}`}>{t.desc}</p>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )
    }
  }

  // Mostra bottone avanti?
  function showNext() {
    if (globalStep.phase === 'nome') return nome.trim().length > 0
    if (globalStep.phase === 'ambiti') return false
    if (globalStep.phase === 'note') return false
    if (globalStep.phase === 'ambito') {
      const { ambitoIndex, stepIndex } = globalStep
      const steps = getStepsForAmbito(ambitiData[ambitoIndex])
      const step = steps[stepIndex]
      return ['fonti', 'conflitto_tono'].includes(step)
    }
    return false
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 w-full max-w-lg">

        {/* Progress bar */}
        <div className="h-1.5 bg-gray-100 rounded-t-2xl overflow-hidden">
          <div
            className="h-full bg-gray-900 transition-all duration-500"
            style={{ width: `${(current / total) * 100}%` }}
          />
        </div>

        <div className="p-8">
          <p className="text-xs text-gray-400 mb-6">Step {current} di {total}</p>

          {renderStep()}

          {error && <p className="mt-4 text-red-500 text-sm">{error}</p>}

          <div className="flex gap-3 mt-8">
            {globalStep.phase !== 'nome' && (
              <button
                onClick={prevStep}
                className="px-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:border-gray-400 transition-colors"
              >
                ← Indietro
              </button>
            )}

            {/* Avanti per nome */}
            {globalStep.phase === 'nome' && nome.trim() && (
              <button
                onClick={() => setGlobalStep({ phase: 'ambiti' })}
                className="flex-1 bg-gray-900 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-gray-800 transition-colors"
              >
                Continua →
              </button>
            )}

            {/* Avanti per selezione ambiti */}
            {globalStep.phase === 'ambiti' && ambitiSelezionati.length > 0 && (
              <button
                onClick={startAmbitiFlow}
                className="flex-1 bg-gray-900 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-gray-800 transition-colors"
              >
                Continua ({ambitiSelezionati.length} {ambitiSelezionati.length === 1 ? 'ambito' : 'ambiti'}) →
              </button>
            )}

            {/* Avanti per step con conferma manuale */}
            {showNext() && (
              <button
                onClick={nextStep}
                className="flex-1 bg-gray-900 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-gray-800 transition-colors"
              >
                Continua →
              </button>
            )}

            {/* Bottone finale */}
            {globalStep.phase === 'note' && (
              <button
                onClick={generateAndSave}
                disabled={loading}
                className="flex-1 bg-gray-900 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-gray-800 disabled:opacity-40 transition-colors"
              >
                {loading ? 'Creo il tuo assistente...' : 'Crea il mio assistente →'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
