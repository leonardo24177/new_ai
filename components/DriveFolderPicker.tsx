'use client'

/**
 * DriveFolderPicker.tsx
 *
 * Componente riutilizzabile per collegare cartelle Google Drive con contesto.
 * Usa Google Picker API per scegliere la cartella.
 *
 * Props:
 *  - folders: DriveFolder[]          — stato corrente
 *  - onChange: (f: DriveFolder[]) => void — callback aggiornamento
 *
 * Ambiente richiesto:
 *  - NEXT_PUBLIC_GOOGLE_CLIENT_ID in .env.local
 *  - Google Drive API + Google Picker API abilitati in Google Cloud Console
 *
 * Funzionamento OAuth:
 *  - Usa gapi (Google API client) per il token
 *  - Poi apre il Picker per scegliere la cartella
 *  - Salva folder_id, nome e contesto nello stato padre
 */

import { useState, useEffect, useCallback } from 'react'

export interface DriveFolder {
  folder_id: string
  nome: string
  contesto: string
}

interface Props {
  folders: DriveFolder[]
  onChange: (folders: DriveFolder[]) => void
}

declare global {
  interface Window {
    gapi: {
      load: (api: string, cb: () => void) => void
      auth2?: {
        getAuthInstance: () => {
          signIn: () => Promise<{ getAuthResponse: () => { access_token: string } }>
        }
      }
      client?: {
        init: (config: object) => Promise<void>
      }
    }
    google: {
      picker: {
        PickerBuilder: new () => {
          addView: (v: unknown) => unknown
          setOAuthToken: (t: string) => unknown
          setDeveloperKey: (k: string) => unknown
          setCallback: (cb: (data: PickerResponse) => void) => unknown
          build: () => { setVisible: (v: boolean) => void }
        }
        DocsView: new () => { setIncludeFolders: (v: boolean) => unknown; setSelectFolderEnabled: (v: boolean) => unknown; setMimeTypes: (m: string) => unknown }
        Action: { PICKED: string }
      }
    }
  }
}

interface PickerResponse {
  action: string
  docs?: Array<{ id: string; name: string }>
}

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!
const SCOPE = 'https://www.googleapis.com/auth/drive.readonly'

export default function DriveFolderPicker({ folders, onChange }: Props) {
  const [gapiReady, setGapiReady] = useState(false)
  const [pickerLoading, setPickerLoading] = useState(false)
  // Tiene traccia dell'indice della cartella in modifica del contesto
  const [editingIdx, setEditingIdx] = useState<number | null>(null)

  // Carica gli script Google una sola volta
  useEffect(() => {
    function loadGapi() {
      const script = document.createElement('script')
      script.src = 'https://apis.google.com/js/api.js'
      script.onload = () => {
        window.gapi.load('auth2:picker', () => {
          window.gapi.client?.init({ clientId: CLIENT_ID, scope: SCOPE })
            .then(() => setGapiReady(true))
            .catch(() => {
              // init può fallire se auth2 non è ancora pronto, ma il picker funziona lo stesso
              setGapiReady(true)
            })
        })
      }
      document.body.appendChild(script)
    }

    if (!window.gapi) {
      loadGapi()
    } else {
      setGapiReady(true)
    }
  }, [])

  const openPicker = useCallback(async () => {
    if (!gapiReady) return
    setPickerLoading(true)

    try {
      // Ottieni access token tramite OAuth popup
      const authInstance = window.gapi.auth2?.getAuthInstance()
      const user = await authInstance?.signIn()
      const accessToken = user?.getAuthResponse().access_token

      if (!accessToken) throw new Error('Token non ottenuto')

      // Costruisce il Picker per selezionare SOLO cartelle
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
            // Apre automaticamente l'editor del contesto per la nuova cartella
            setEditingIdx(folders.length)
          }
        })
        .build()

      picker.setVisible(true)
    } catch (err) {
      console.error('Errore apertura Picker:', err)
    } finally {
      setPickerLoading(false)
    }
  }, [gapiReady, folders, onChange])

  function updateContesto(idx: number, contesto: string) {
    const updated = folders.map((f, i) => i === idx ? { ...f, contesto } : f)
    onChange(updated)
  }

  function removeFolder(idx: number) {
    onChange(folders.filter((_, i) => i !== idx))
    if (editingIdx === idx) setEditingIdx(null)
  }

  return (
    <div className="space-y-3">

      {/* Lista cartelle collegate */}
      {folders.length > 0 && (
        <div className="space-y-2">
          {folders.map((folder, idx) => (
            <div key={folder.folder_id} className="bg-white border border-gray-200 rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {/* Icona Drive */}
                  <span className="text-xl flex-shrink-0">
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
                  <button
                    onClick={() => setEditingIdx(editingIdx === idx ? null : idx)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                    title="Modifica contesto"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => removeFolder(idx)}
                    className="p-1.5 text-gray-300 hover:text-red-400 rounded-lg transition-colors"
                    title="Rimuovi cartella"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Editor contesto inline */}
              {editingIdx === idx && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <label className="text-xs font-medium text-gray-500 mb-1.5 block">
                    A cosa serve questa cartella? (l&apos;AI userà questa descrizione per capire quando consultarla)
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

      {/* Pulsante aggiungi cartella */}
      <button
        onClick={openPicker}
        disabled={!gapiReady || pickerLoading}
        className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-2xl py-3.5 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700 disabled:opacity-40 transition-all"
      >
        {pickerLoading ? (
          <span className="text-xs">Apertura Drive...</span>
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

      {folders.length === 0 && (
        <p className="text-xs text-gray-400 text-center">
          Collega cartelle Drive per usarle come fonte nelle tue chat
        </p>
      )}
    </div>
  )
}
