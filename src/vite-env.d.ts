/// <reference types="vite/client" />

interface ElectronAPI {
  openFile: () => Promise<{ filePath: string; data: any } | null>
  saveFile: (data: { defaultName: string; content: any }) => Promise<string | null>
  saveFileAs: (data: { defaultName: string; content: any }) => Promise<string | null>
  exportFile: (options: { format: string; data: any; defaultName: string }) => Promise<{ filePath: string; format: string; data: any } | null>

  onMenuNew: (callback: () => void) => void
  onMenuSave: (callback: () => void) => void
  onMenuExport: (callback: () => void) => void
  onOpenAISettings: (callback: () => void) => void

  platform: string
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
