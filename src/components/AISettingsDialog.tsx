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
    <div className="dialog-backdrop">
      <div className="dialog-panel max-w-md">
        <div className="dialog-header">
          <h2 className="text-lg font-bold">🤖 AI Configuration</h2>
          <p className="text-sm text-gray-500 mt-1">
            Konfigurasi koneksi ke AI provider. App tetap bisa dipakai tanpa AI.
          </p>
        </div>

        <div className="dialog-body space-y-4">
          <div className="form-group">
            <label className="form-label">API Host URL</label>
            <input
              type="text"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              className="form-input"
              placeholder="https://api.openai.com"
            />
            <p className="form-hint">
              OpenAI, Anthropic (via proxy), Ollama (http://localhost:11434), dll
            </p>
          </div>

          <div className="form-group">
            <label className="form-label">API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="form-input"
              placeholder="sk-..."
            />
          </div>

          <div className="form-group">
            <label className="form-label">Model</label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="form-input"
              placeholder="gpt-4o"
            />
            <p className="form-hint">
              GPT-4o, Claude-3.5-sonnet, gemini-pro, llama3, dll
            </p>
          </div>

          {testStatus !== 'idle' && (
            <div className={`status-msg ${testStatus === 'ok' ? 'status-msg-ok' : testStatus === 'loading' ? 'status-msg-info' : 'status-msg-err'}`}>
              {testStatus === 'loading' ? '⏳' : testStatus === 'ok' ? '✅' : '❌'} {testMessage}
            </div>
          )}
        </div>

        <div className="dialog-footer justify-between">
          <button onClick={handleTest} className="btn btn-secondary">
            Test Connection
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn btn-secondary">
              Batal
            </button>
            <button onClick={handleSave} className="btn btn-primary">
              Simpan
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}