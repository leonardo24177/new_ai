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

const TOTAL_STEPS = 9

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

const AMBITI = [
  { value: 'lavoro', label: 'Lavoro', emoji: '💼' },
  { value: 'studio', label: 'Studio', emoji: '📖' },
  { value: 'personale', label: 'Uso personale', emoji: '🏠' },
]

export default function OnboardingForm() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  const [data, setData] = useState<OnboardingData>({
    nome: '',
    ambito: '',
    professione: '',
    utilizzo: '',
    specializzazione: '',
    fonti: [],
    fonti_escluse: [],
    citazione: 'sempre',
    conflitto_fonti: 'gerarchia',
    tono: 'formale',
    note_libere: '',
  })

  // Aggiorna le fonti quando cambia professione/utilizzo/specializzazione
  useEffect(() => {
    if (data.professione && data.utilizzo) {
      const fonti = getFontiDefault(data.professione, data.utilizzo, data.specializzazione)
      if (fonti.length > 0) {
        setData(prev => ({ ...prev, fonti }))
      }
    }
  }, [data.professione, data.utilizzo, data.specializzazione])

  function update(field: keyof OnboardingData, value: unknown) {
    setData(prev => ({ ...prev, [field]: value }))
  }

  // Calcola steps visibili in base all'ambito
  function getMaxStep() {
    if (data.ambito === 'lavoro') return TOTAL_STEPS
    if (data.ambito === 'studio') return 5
    if (data.ambito === 'personale') return 4
    return TOTAL_STEPS
  }

  function canProceed() {
    switch (step) {
      case 1: return data.nome.trim().length > 0
      case 2: return data.ambito !== ''
      case 3:
        if (data.ambito === 'lavoro') return data.professione !== ''
        if (data.ambito === 'studio') return data.utilizzo !== ''
        return data.utilizzo !== ''
      case 4:
        if (data.ambito === 'lavoro') return data.utilizzo !== ''
        return data.tono !== ''
      case 5:
        if (data.ambito === 'lavoro') {
          const key = `${data.professione}_${data.utilizzo}`
          const hasSpe = SPECIALIZZAZIONI[key]?.length > 0
          if (hasSpe) return data.specializzazione !== ''
          return true
        }
        return true
      default: return true
    }
  }

  // Drag & drop fonti
  function onDragStart(index: number) { setDragIndex(index) }
  function onDragOver(e: React.DragEvent, index: number) {
    e.preventDefault()
    if (dragIndex === null || dragIndex === index) return
    const newFonti = [...data.fonti]
    const [moved] = newFonti.splice(dragIndex, 1)
    newFonti.splice(index, 0, moved)
    setData(prev => ({ ...prev, fonti: newFonti }))
    setDragIndex(index)
  }
  function onDragEnd() { setDragIndex(null) }

  function toggleEscludi(fonteId: string) {
    setData(prev => ({
      ...prev,
      fonti_escluse: prev.fonti_escluse.includes(fonteId)
        ? prev.fonti_escluse.filter(f => f !== fonteId)
        : [...prev.fonti_escluse, fonteId]
    }))
  }

  async function generateAndSave() {
    setLoading(true)
    try {
      const res = await fetch('/api/onboarding/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const { system_prompt } = await res.json()

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Non autenticato')

      await supabase.from('user_configs').upsert({
        user_id: user.id,
        system_prompt_base: system_prompt,
        nome_assistente: 'Assistente',
        lingua: 'it',
      })

      router.push('/chat')
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const specializzioneKey = `${data.professione}_${data.utilizzo}`
  const hasSpecializzazione = SPECIALIZZAZIONI[specializzioneKey]?.length > 0

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 w-full max-w-lg">

        {/* Progress bar */}
        <div className="h-1.5 bg-gray-100 rounded-t-2xl overflow-hidden">
          <div
            className="h-full bg-gray-900 transition-all duration-500"
            style={{ width: `${(step / getMaxStep()) * 100}%` }}
          />
        </div>

        <div className="p-8">
          {/* Step counter */}
          <p className="text-xs text-gray-400 mb-6">
            Step {step} di {getMaxStep()}
          </p>

          {/* STEP 1 — Nome */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-1">Come ti chiami?</h2>
              <p className="text-gray-500 text-sm mb-6">Il tuo assistente userà il tuo nome</p>
              <input
                type="text"
                value={data.nome}
                onChange={e => update('nome', e.target.value)}
                placeholder="Il tuo nome"
                autoFocus
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                onKeyDown={e => e.key === 'Enter' && canProceed() && setStep(2)}
              />
            </div>
          )}

          {/* STEP 2 — Ambito */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-1">In che ambito lo usi?</h2>
              <p className="text-gray-500 text-sm mb-6">Scegli l&apos;uso principale dell&apos;assistente</p>
              <div className="space-y-3">
                {AMBITI.map(a => (
                  <button
                    key={a.value}
                    onClick={() => { update('ambito', a.value); setStep(3) }}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border text-sm font-medium transition-all ${
                      data.ambito === a.value
                        ? 'border-gray-900 bg-gray-900 text-white'
                        : 'border-gray-200 hover:border-gray-400 text-gray-700'
                    }`}
                  >
                    <span className="text-xl">{a.emoji}</span>
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3 — Professione (lavoro) o Livello (studio) o Utilizzo (personale) */}
          {step === 3 && (
            <div>
              {data.ambito === 'lavoro' && (
                <>
                  <h2 className="text-xl font-semibold text-gray-900 mb-1">Che professione hai?</h2>
                  <p className="text-gray-500 text-sm mb-6">Personalizzeremo le fonti in base al tuo settore</p>
                  <div className="grid grid-cols-2 gap-3">
                    {PROFESSIONI.map(p => (
                      <button
                        key={p.value}
                        onClick={() => { update('professione', p.value); update('utilizzo', ''); update('specializzazione', ''); setStep(4) }}
                        className={`flex flex-col items-center gap-2 px-4 py-4 rounded-xl border text-sm font-medium transition-all ${
                          data.professione === p.value
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
              {data.ambito === 'studio' && (
                <>
                  <h2 className="text-xl font-semibold text-gray-900 mb-1">Che livello scolastico?</h2>
                  <p className="text-gray-500 text-sm mb-6">Adatteremo il linguaggio al tuo contesto</p>
                  <div className="space-y-3">
                    {STUDI.map(s => (
                      <button
                        key={s.value}
                        onClick={() => { update('utilizzo', s.value); setStep(4) }}
                        className={`w-full px-4 py-3.5 rounded-xl border text-sm font-medium text-left transition-all ${
                          data.utilizzo === s.value
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
              {data.ambito === 'personale' && (
                <>
                  <h2 className="text-xl font-semibold text-gray-900 mb-1">Per cosa lo usi principalmente?</h2>
                  <p className="text-gray-500 text-sm mb-6">Scegli l&apos;uso principale</p>
                  <div className="space-y-3">
                    {['Organizzazione', 'Scrittura', 'Ricerca', 'Hobby', 'Benessere'].map(u => (
                      <button
                        key={u}
                        onClick={() => { update('utilizzo', u.toLowerCase()); setStep(4) }}
                        className={`w-full px-4 py-3.5 rounded-xl border text-sm font-medium text-left transition-all ${
                          data.utilizzo === u.toLowerCase()
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
            </div>
          )}

          {/* STEP 4 — Utilizzo principale (lavoro) o Tono (studio/personale) */}
          {step === 4 && (
            <div>
              {data.ambito === 'lavoro' && data.professione && data.professione !== 'altro' && (
                <>
                  <h2 className="text-xl font-semibold text-gray-900 mb-1">Per quale utilizzo principale?</h2>
                  <p className="text-gray-500 text-sm mb-6">Come vuoi usare l&apos;assistente nel tuo lavoro</p>
                  <div className="space-y-3">
                    {UTILIZZI[data.professione as Professione]?.map(u => (
                      <button
                        key={u.value}
                        onClick={() => { update('utilizzo', u.value); update('specializzazione', ''); setStep(hasSpecializzazione ? 5 : 6) }}
                        className={`w-full px-4 py-3.5 rounded-xl border text-sm font-medium text-left transition-all ${
                          data.utilizzo === u.value
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
              {(data.ambito === 'studio' || data.ambito === 'personale') && (
                <>
                  <h2 className="text-xl font-semibold text-gray-900 mb-1">Che tono preferisci?</h2>
                  <p className="text-gray-500 text-sm mb-6">Come vuoi che ti risponda l&apos;assistente</p>
                  <div className="space-y-3">
                    {TONI.map(t => (
                      <button
                        key={t.value}
                        onClick={() => { update('tono', t.value as 'formale' | 'diretto' | 'colloquiale'); setStep(5) }}
                        className={`w-full px-4 py-3.5 rounded-xl border text-left transition-all ${
                          data.tono === t.value
                            ? 'border-gray-900 bg-gray-900 text-white'
                            : 'border-gray-200 hover:border-gray-400 text-gray-700'
                        }`}
                      >
                        <p className="text-sm font-medium">{t.label}</p>
                        <p className={`text-xs mt-0.5 ${data.tono === t.value ? 'text-gray-300' : 'text-gray-400'}`}>{t.desc}</p>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* STEP 5 — Specializzazione (solo lavoro con specializzazione disponibile) */}
          {step === 5 && data.ambito === 'lavoro' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-1">Specializzazione</h2>
              <p className="text-gray-500 text-sm mb-6">Seleziona l&apos;area specifica</p>
              <div className="space-y-3">
                {SPECIALIZZAZIONI[specializzioneKey]?.map(s => (
                  <button
                    key={s.value}
                    onClick={() => { update('specializzazione', s.value); setStep(6) }}
                    className={`w-full px-4 py-3.5 rounded-xl border text-sm font-medium text-left transition-all ${
                      data.specializzazione === s.value
                        ? 'border-gray-900 bg-gray-900 text-white'
                        : 'border-gray-200 hover:border-gray-400 text-gray-700'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 6 — Fonti e gerarchia (drag & drop) */}
          {step === 6 && data.ambito === 'lavoro' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-1">Gerarchia delle fonti</h2>
              <p className="text-gray-500 text-sm mb-2">Trascina per riordinare. La posizione determina la priorità.</p>
              <p className="text-xs text-gray-400 mb-5">La fonte in cima ha la massima priorità</p>

              {data.fonti.length === 0 ? (
                <p className="text-gray-400 text-sm italic">Nessuna fonte predefinita per questa combinazione. Potrai aggiungerle manualmente.</p>
              ) : (
                <div className="space-y-2">
                  {data.fonti.map((fonte, index) => (
                    <div
                      key={fonte.id}
                      draggable
                      onDragStart={() => onDragStart(index)}
                      onDragOver={e => onDragOver(e, index)}
                      onDragEnd={onDragEnd}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-grab active:cursor-grabbing transition-all ${
                        dragIndex === index ? 'opacity-50 scale-95' : 'opacity-100'
                      } ${data.fonti_escluse.includes(fonte.id) ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                    >
                      <span className="text-gray-300 text-sm font-mono select-none">{index + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${data.fonti_escluse.includes(fonte.id) ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                          {fonte.label}
                        </p>
                        {fonte.descrizione && (
                          <p className="text-xs text-gray-400 truncate">{fonte.descrizione}</p>
                        )}
                      </div>
                      <button
                        onClick={() => toggleEscludi(fonte.id)}
                        className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${
                          data.fonti_escluse.includes(fonte.id)
                            ? 'bg-red-100 text-red-600 hover:bg-red-200'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {data.fonti_escluse.includes(fonte.id) ? 'Ripristina' : 'Escludi'}
                      </button>
                      <span className="text-gray-300 cursor-grab">⠿</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP 7 — Comportamento citazioni */}
          {step === 7 && data.ambito === 'lavoro' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-1">Come vuoi le citazioni?</h2>
              <p className="text-gray-500 text-sm mb-6">Come deve citare le fonti il tuo assistente</p>
              <div className="space-y-3">
                {[
                  { value: 'sempre', label: 'Sempre con riferimento preciso', desc: 'Art., comma, sentenza n., circolare n.' },
                  { value: 'essenziale', label: 'Solo quando essenziale', desc: 'Solo per affermazioni critiche o disputate' },
                  { value: 'mai', label: 'Mai — solo contenuto', desc: 'Risposte fluide senza riferimenti normativi' },
                ].map(c => (
                  <button
                    key={c.value}
                    onClick={() => { update('citazione', c.value as 'sempre' | 'essenziale' | 'mai'); setStep(8) }}
                    className={`w-full px-4 py-3.5 rounded-xl border text-left transition-all ${
                      data.citazione === c.value
                        ? 'border-gray-900 bg-gray-900 text-white'
                        : 'border-gray-200 hover:border-gray-400 text-gray-700'
                    }`}
                  >
                    <p className="text-sm font-medium">{c.label}</p>
                    <p className={`text-xs mt-0.5 ${data.citazione === c.value ? 'text-gray-300' : 'text-gray-400'}`}>{c.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 8 — Conflitto tra fonti + Tono (lavoro) */}
          {step === 8 && data.ambito === 'lavoro' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-1">In caso di conflitto tra fonti</h2>
              <p className="text-gray-500 text-sm mb-4">Cosa deve fare l&apos;assistente quando le fonti si contraddicono</p>
              <div className="space-y-3 mb-8">
                {[
                  { value: 'gerarchia', label: 'Segui la gerarchia impostata', desc: 'Prevale sempre la fonte con priorità maggiore' },
                  { value: 'entrambe', label: 'Presenta entrambe le posizioni', desc: 'Mostra le diverse interpretazioni' },
                  { value: 'chiedi', label: 'Chiedimi come procedere', desc: 'Si ferma e chiede istruzioni' },
                ].map(c => (
                  <button
                    key={c.value}
                    onClick={() => update('conflitto_fonti', c.value as 'gerarchia' | 'entrambe' | 'chiedi')}
                    className={`w-full px-4 py-3.5 rounded-xl border text-left transition-all ${
                      data.conflitto_fonti === c.value
                        ? 'border-gray-900 bg-gray-900 text-white'
                        : 'border-gray-200 hover:border-gray-400 text-gray-700'
                    }`}
                  >
                    <p className="text-sm font-medium">{c.label}</p>
                    <p className={`text-xs mt-0.5 ${data.conflitto_fonti === c.value ? 'text-gray-300' : 'text-gray-400'}`}>{c.desc}</p>
                  </button>
                ))}
              </div>

              <h3 className="text-base font-semibold text-gray-900 mb-1">Tono preferito</h3>
              <p className="text-gray-500 text-sm mb-3">Come vuoi che ti risponda</p>
              <div className="space-y-2">
                {TONI.map(t => (
                  <button
                    key={t.value}
                    onClick={() => update('tono', t.value as 'formale' | 'diretto' | 'colloquiale')}
                    className={`w-full px-4 py-3 rounded-xl border text-left transition-all ${
                      data.tono === t.value
                        ? 'border-gray-900 bg-gray-900 text-white'
                        : 'border-gray-200 hover:border-gray-400 text-gray-700'
                    }`}
                  >
                    <p className="text-sm font-medium">{t.label}</p>
                    <p className={`text-xs mt-0.5 ${data.tono === t.value ? 'text-gray-300' : 'text-gray-400'}`}>{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 9 (o ultimo step) — Note libere */}
          {(step === 9 || (data.ambito !== 'lavoro' && step === getMaxStep())) && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-1">Qualcosa che devo sapere?</h2>
              <p className="text-gray-500 text-sm mb-6">
                Informazioni aggiuntive che vuoi dare al tuo assistente (opzionale)
              </p>
              <textarea
                value={data.note_libere}
                onChange={e => update('note_libere', e.target.value)}
                placeholder="Es. Lavoro principalmente con clienti stranieri, preferisco risposte in italiano ma con riferimenti anche alla normativa UE..."
                rows={5}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
              />
            </div>
          )}

          {/* Navigazione */}
          <div className="flex gap-3 mt-8">
            {step > 1 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="px-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:border-gray-400 transition-colors"
              >
                ← Indietro
              </button>
            )}

            {/* Avanti — non mostrato negli step con selezione diretta (2,3,4,5,7) */}
            {![2, 3, 4, 5, 7].includes(step) && step < getMaxStep() && (
              <button
                onClick={() => setStep(s => s + 1)}
                disabled={!canProceed()}
                className="flex-1 bg-gray-900 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-gray-800 disabled:opacity-40 transition-colors"
              >
                Continua →
              </button>
            )}

            {/* Bottone finale */}
            {step === getMaxStep() && (
              <button
                onClick={generateAndSave}
                disabled={loading}
                className="flex-1 bg-gray-900 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-gray-800 disabled:opacity-40 transition-colors"
              >
                {loading ? 'Creo il tuo assistente...' : 'Crea il mio assistente →'}
              </button>
            )}

            {/* Avanti per step 6 e 8 (non auto-advance) */}
            {[6, 8].includes(step) && step < getMaxStep() && (
              <button
                onClick={() => setStep(s => s + 1)}
                className="flex-1 bg-gray-900 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-gray-800 transition-colors"
              >
                Continua →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
