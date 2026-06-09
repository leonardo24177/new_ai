'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="it">
      <body>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', background: '#f9fafb', padding: '1rem' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '3rem', fontWeight: 'bold', color: '#111', marginBottom: '0.5rem' }}>500</p>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.5rem' }}>Qualcosa è andato storto. Il problema è stato segnalato automaticamente.</p>
            <button onClick={reset} style={{ background: '#111', color: '#fff', padding: '0.75rem 1.5rem', borderRadius: '0.75rem', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }}>
              Riprova
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
