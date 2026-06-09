'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem('cookie_consent')) setVisible(true)
  }, [])

  function accept() {
    localStorage.setItem('cookie_consent', '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white border-t border-gray-200 shadow-lg">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <p className="text-xs text-gray-600 flex-1">
          Questo sito utilizza solo cookie tecnici necessari al funzionamento del servizio.
          Nessun cookie di profilazione o tracciamento. Consulta la nostra{' '}
          <Link href="/privacy" className="underline hover:text-gray-900">Privacy Policy</Link>.
        </p>
        <button
          onClick={accept}
          className="flex-shrink-0 bg-gray-900 text-white text-xs font-medium px-4 py-2 rounded-xl hover:bg-gray-800 transition-colors"
        >
          Ho capito
        </button>
      </div>
    </div>
  )
}
