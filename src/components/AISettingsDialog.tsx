import { useState, useEffect } from 'react'
import { getAISettings, setAISettings, testConnection } from '../services/ai'

interface AISettingsDialogProps {
  open: boolean
  onClose: () => void
}

export function AISettingsDialog({ open, onClose }: AISettingsDialogProps) {
  const [host, setHost] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('')
  const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [testMessage, setTestMessage] = useState('')

  useEffect(() => {
    if (open) {
      const s = getAISettings()
      setHost(s.apiHost)
      setApiKey(s.apiKey)
      setModel(s.model)
      setTestStatus('idle')
      setTestMessage('')
    }
  }, [open])

  const handleSave = () => {
    setAISettings({ apiHost: host, apiKey, model })
    onClose()
  }

  const handleTest = async () => {
    setTestStatus('loading')
    setTestMessage('Menghubungi server...')
    setAISettings({ apiHost: host, apiKey, model })
    const result = await testConnection()
    setTestStatus(result.ok ? 'ok' : 'error')
    setTestMessage(result.message)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-bold">🤖 AI Configuration</h2>
          <p className="text-sm text-gray-500 mt-1">
            Konfigurasi koneksi ke AI provider. App tetap bisa dipakai tanpa AI.
          </p>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">API Host URL</label>
            <input
              type="text"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="https://api.openai.com"
            />
            <p className="text-xs text-gray-400 mt-1">
              OpenAI, Anthropic (via proxy), Ollama (http://localhost:11434), dll
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="sk-..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="gpt-4o"
            />
            <p className="text-xs text-gray-400 mt-1">
              GPT-4o, Claude-3.5-sonnet, gemini-pro, llama3, dll
            </p>
          </div>

          {testStatus !== 'idle' && (
            <div className={`p-3 rounded text-sm ${testStatus === 'ok' ? 'bg-green-50 text-green-700' : testStatus === 'loading' ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'}`}>
              {testStatus === 'loading' ? '⏳' : testStatus === 'ok' ? '✅' : '❌'} {testMessage}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t flex justify-between">
          <button
            onClick={handleTest}
            className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md"
          >
            Test Connection
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md"
            >
              Batal
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md"
            >
              Simpan
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}