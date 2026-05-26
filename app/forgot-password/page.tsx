'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="min-h-screen flex flex-col justify-center bg-gray-50 px-4 py-8">
        <div className="w-full max-w-sm mx-auto">
          <div className="flex justify-center mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gray-900 flex items-center justify-center">
              <span className="text-white text-lg font-semibold">AI</span>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 text-center">
            <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Email inviata</h2>
            <p className="text-gray-500 text-sm mb-6">
              Controlla la tua casella di posta. Ti abbiamo inviato un link per reimpostare la password.
            </p>
            <Link
              href="/login"
              className="block w-full bg-gray-900 text-white rounded-xl py-3 text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              Torna al login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-sm mx-auto">
        <div className="flex justify-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gray-900 flex items-center justify-center">
            <span className="text-white text-lg font-semibold">AI</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h1 className="text-xl font-semibold text-gray-900 mb-1">Password dimenticata</h1>
          <p className="text-gray-500 text-sm mb-6">
            Inserisci la tua email e ti mandiamo un link per reimpostare la password.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoCapitalize="none"
                inputMode="email"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-gray-900 text-gray-900"
                placeholder="tu@esempio.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-900 text-white rounded-xl py-3.5 text-base font-medium hover:bg-gray-800 active:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Invio in corso...' : 'Invia link di reset'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          <Link href="/login" className="text-gray-900 font-semibold hover:underline">
            ← Torna al login
          </Link>
        </p>
      </div>
    </div>
  )
}
