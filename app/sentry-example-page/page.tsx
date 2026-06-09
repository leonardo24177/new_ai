'use client'

import * as Sentry from '@sentry/nextjs'

export default function SentryTestPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-sm w-full text-center">
        <h1 className="text-lg font-semibold text-gray-900 mb-2">Test Sentry</h1>
        <p className="text-sm text-gray-500 mb-6">Clicca il bottone per inviare un errore di test a Sentry.</p>
        <button
          onClick={() => {
            Sentry.captureException(new Error('Test error da assistente-ai.it'))
            alert('Errore inviato! Controlla su sentry.io')
          }}
          className="w-full bg-gray-900 text-white rounded-xl py-3 text-sm font-medium"
        >
          Invia errore di test
        </button>
      </div>
    </div>
  )
}
