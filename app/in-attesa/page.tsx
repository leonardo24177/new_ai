'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function InAttesaPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(false)

  async function checkApproval() {
    setChecking(true)
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.refreshSession()
    if (session?.user?.app_metadata?.approvato === true) {
      router.push('/chat')
    } else {
      setChecking(false)
    }
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="w-16 h-16 rounded-2xl bg-gray-900 flex items-center justify-center mx-auto mb-6">
          <span className="text-white text-2xl font-semibold">AI</span>
        </div>

        <h1 className="text-xl font-semibold text-gray-900 mb-2">Registrazione completata</h1>
        <p className="text-gray-500 text-sm mb-8 leading-relaxed">
          Il tuo account è in fase di revisione. Riceverai un'email non appena sarà approvato.
        </p>

        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6 text-left space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-lg mt-0.5">⏳</span>
            <div>
              <p className="text-sm font-medium text-gray-900">Revisione in corso</p>
              <p className="text-xs text-gray-500">Il team sta verificando il tuo account.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-lg mt-0.5">📧</span>
            <div>
              <p className="text-sm font-medium text-gray-900">Email di conferma</p>
              <p className="text-xs text-gray-500">Ti notificheremo via email quando sarai approvato.</p>
            </div>
          </div>
        </div>

        <button
          onClick={checkApproval}
          disabled={checking}
          className="w-full bg-gray-900 text-white rounded-xl py-3.5 text-sm font-medium disabled:opacity-50 transition-colors mb-3"
        >
          {checking ? 'Controllo in corso...' : 'Controlla stato approvazione'}
        </button>

        <button
          onClick={handleLogout}
          className="w-full text-sm text-gray-400 py-2 hover:text-gray-600 transition-colors"
        >
          Esci
        </button>
      </div>
    </div>
  )
}
