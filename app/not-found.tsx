import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-gray-900 flex items-center justify-center mx-auto mb-6">
          <span className="text-white text-xl font-semibold">AI</span>
        </div>
        <p className="text-5xl font-bold text-gray-900 mb-3">404</p>
        <p className="text-gray-500 text-sm mb-8">Questa pagina non esiste.</p>
        <Link href="/chat" className="bg-gray-900 text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors">
          Torna alla chat
        </Link>
      </div>
    </div>
  )
}
