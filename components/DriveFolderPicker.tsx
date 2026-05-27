'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface DriveFolder {
  folder_id: string
  nome: string
  contesto: string
}

interface Props {
  folders: DriveFolder[]
  onChange: (folders: DriveFolder[]) => void
}

interface PickerResponse {
  action: string
  docs?: Array<{ id: string; name: string }>
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gapi: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    google: any
  }
}

export default function DriveFolderPicker({ folders, onChange }: Props) {
  const [pickerReady, setPickerReady] = useState(false)
  const [pickerLoading, setPickerLoading] = useState(false)
  const [editingIdx, setEditingIdx] = useState<number | null>(null)

  useEffect(() => {
    function loadPicker() {
      const script = document.createElement('script')
      script.src = 'https://apis.google.com/js/api.js'
      script.onload = () => {
        window.gapi.load('picker', () => {
          setPickerReady(true)
        })
      }
      script.onerror = () => console.error('Errore caricamento gapi')
      document.body.appendChild(script)
    }

    if (typeof window !== 'undefined') {
      if (!window.gapi) {
        loadPicker()
      } else if (window.google?.picker) {
        setPickerReady(true)
      } else {
        window.gapi.load('picker', () => setPickerReady(true))
      }
    }
  }, [])

  const openPicker = useCallback(async () => {
    if (!pickerReady) return
    setPickerLoading(true)

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      // DEBUG — rimuovere dopo il test
      console.log('Session completa:', session)
      console.log('provider_token:', session?.provider_token)
      console.log('access_token:', session?.access_token)

      const accessToken = session?.provider_token

      if (!accessToken) {
        alert(`Token Google non disponibile.\n\nDebug:\n- provider_token: ${session?.provider_token}\n- user: ${session?.user?.email}\n\nProva logout + login con Google.`)
        return
      }

      const view = new window.google.picker.DocsView()
      view.setIncludeFolders(true)
      view.setSelectFolderEnabled(true)
      view.setMimeTypes('application/vnd.google-apps.folder')

      const picker = new window.google.picker.PickerBuilder()
        .addView(view)
        .setOAuthToken(accessToken)
        .setCallback((data: PickerResponse) => {
          if (data.action === window.google.picker.Action.PICKED && data.docs?.[0]) {
            const doc = data.docs[0]
            const nuovaCartella: DriveFolder = {
              folder_id: doc.id,
              nome: doc.name,
              contesto: '',
            }
            onChange([...folders, nuovaCartella])
            setEditingIdx(folders.length)
          }
        })
        .build()

      picker.setVisible(true)
    } catch (err) {
      console.error('Errore apertura Picker:', err)
      alert('Errore apertura Drive. Controlla la console.')
    } finally {
      setPickerLoading(false)
    }
  }, [pickerReady, folders, onChange])

  function updateContesto(idx: number, contesto: string) {
    onChange(folders.map((f, i) => i === idx ? { ...f, contesto } : f))
  }

  function removeFolder(idx: number) {
    onChange(folders.filter((_, i) => i !== idx))
    if (editingIdx === idx) setEditingIdx(null)
  }

  return (
    <div className="space-y-3">
      {folders.length > 0 && (
        <div className="space-y-2">
          {folders.map((folder, idx) => (
            <div key={folder.folder_id} className="bg-white border border-gray-200 rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="flex-shrink-0">
                    <svg width="20" height="18" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
                      <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                      <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                      <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                      <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                      <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                      <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 27h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                    </svg>
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">📁 {folder.nome}</p>
                    {folder.contesto ? (
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{folder.contesto}</p>
                    ) : (
                      <p className="text-xs text-amber-500 mt-0.5">⚠️ Aggiungi un contesto</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => setEditingIdx(editingIdx === idx ? null : idx)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg transition-colors">
                    ✏️
                  </button>
                  <button onClick={() => removeFolder(idx)}
                    className="p-1.5 text-gray-300 hover:text-red-400 rounded-lg transition-colors">
                    ✕
                  </button>
                </div>
              </div>

              {editingIdx === idx && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <label className="text-xs font-medium text-gray-500 mb-1.5 block">
                    A cosa serve questa cartella?
                  </label>
                  <textarea
                    value={folder.contesto}
                    onChange={e => updateContesto(idx, e.target.value)}
                    onBlur={() => setEditingIdx(null)}
                    placeholder='Es. "Le mie ricette di cucina, usala quando parlo di ingredienti o piatti"'
                    rows={2}
                    autoFocus
                    className="w-full text-sm text-gray-900 border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:border-gray-400 transition-colors"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <button
        onClick={openPicker}
        disabled={!pickerReady || pickerLoading}
        className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-2xl py-3.5 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700 disabled:opacity-40 transition-all"
      >
        {pickerLoading ? (
          <span className="text-xs">Apertura Drive...</span>
        ) : !pickerReady ? (
          <span className="text-xs">Caricamento...</span>
        ) : (
          <>
            <svg width="16" height="14" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
              <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
              <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
              <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
              <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
              <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
              <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 27h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
            </svg>
            Collega cartella Google Drive
          </>
        )}
      </button>

      {folders.length === 0 && pickerReady && (
        <p className="text-xs text-gray-400 text-center">
          Collega cartelle Drive per usarle come fonte nelle tue chat
        </p>
      )}
    </div>
  )
}
