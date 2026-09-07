import { useState, useEffect } from 'react'
import { getAISettings, setAISettings, testConnection } from '../services/ai'

interface MasterBerkasGroup {
  id: string
  name: string
}

interface AISettingsDialogProps {
  open: boolean
  onClose: () => void
  onOpenMasterBerkas?: () => void
}

const MASTER_BERKAS_ACTIVE_KEY = 'rps-master-berkas-active-group'

export function AISettingsDialog({ open, onClose, onOpenMasterBerkas }: AISettingsDialogProps) {
  const [provider, setProvider] = useState<'free' | 'custom'>('free')
  const [host, setHost] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('')
  const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [testMessage, setTestMessage] = useState('')
  const [groups, setGroups] = useState<MasterBerkasGroup[]>([])
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      const s = getAISettings()
      setProvider(s.provider || 'free')
      setHost(s.apiHost)
      setApiKey(s.apiKey)
      setModel(s.model)
      setTestStatus('idle')
      setTestMessage('')

      // Load master berkas groups
      try {
        const raw = localStorage.getItem('rps-master-berkas-data')
        if (raw) {
          const d = JSON.parse(raw)
          setGroups(d.groups?.map((g: MasterBerkasGroup) => ({ id: g.id, name: g.name })) || [])
        }
        setActiveGroupId(localStorage.getItem(MASTER_BERKAS_ACTIVE_KEY))
      } catch { /* ignore */ }
    }
  }, [open])

  const handleSave = () => {
    setAISettings({ provider, apiHost: host, apiKey, model })
    onClose()
  }

  const handleTest = async () => {
    setTestStatus('loading')
    setTestMessage('Menghubungi server...')
    setAISettings({ provider, apiHost: host, apiKey, model })
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
            <label className="form-label">Provider</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="provider"
                  value="free"
                  checked={provider === 'free'}
                  onChange={() => setProvider('free')}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium">Gratis</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="provider"
                  value="custom"
                  checked={provider === 'custom'}
                  onChange={() => setProvider('custom')}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium">Custom</span>
              </label>
            </div>
          </div>

          {provider === 'free' && (
            <div className="ai-provider-info">
              <p className="text-sm font-medium">✅ Provider Gratis Aktif</p>
              <p className="text-xs mt-1">
                Bisa digunakan kapan saja dengan batasan penggunaan harian.
              </p>
            </div>
          )}

          {provider === 'custom' && (
            <>
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
        </>
      )}

      <div className="form-group">
        <label className="form-label">Gunakan Master Berkas</label>
        <div className="flex gap-2">
          <select
            value={activeGroupId || ''}
            onChange={(e) => {
              const id = e.target.value || null
              setActiveGroupId(id)
              if (id) {
                localStorage.setItem(MASTER_BERKAS_ACTIVE_KEY, id)
              } else {
                localStorage.removeItem(MASTER_BERKAS_ACTIVE_KEY)
              }
              // Sync active group data to localStorage for AI service
              if (id) {
                try {
                  const raw = localStorage.getItem('rps-master-berkas-data')
                  if (raw) {
                    const d = JSON.parse(raw)
                    const group = d.groups?.find((g: MasterBerkasGroup) => g.id === id)
                    if (group) {
                      localStorage.setItem('rps-master-berkas-data', JSON.stringify({
                        groups: [{ id: group.id, name: group.name, documents: group.documents?.map((doc: { id: string; name: string; extractedText: string }) => ({
                          id: doc.id, name: doc.name, extractedText: doc.extractedText
                        })) || [] }]
                      }))
                    }
                  }
                } catch { /* ignore */ }
              } else {
                localStorage.removeItem('rps-master-berkas-data')
              }
            }}
            className="form-input flex-1"
          >
            <option value="">Tanpa master berkas</option>
            {groups.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={onOpenMasterBerkas}
            className="btn btn-secondary text-sm px-3"
          >
            Kelola
          </button>
        </div>
        <p className="form-hint">
          Pilih kelompok master berkas untuk dijadikan konteks AI saat mengisi otomatis
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
