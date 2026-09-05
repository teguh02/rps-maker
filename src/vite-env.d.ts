/// <reference types="vite/client" />

export {}

declare global {
  interface ElectronAPI {
    openFile: () => Promise<{ filePath: string; data: any } | null>
    openProject: (filePath: string) => Promise<{ filePath: string; data: any } | null>
    saveFile: (data: { defaultName: string; content: any }) => Promise<string | null>
    saveFileAs: (data: { defaultName: string; content: any }) => Promise<string | null>
    saveProjectSilent: (filePath: string, content: any) => Promise<boolean>
    exportFile: (options: { format: string; defaultName?: string }) => Promise<{ filePath: string; format: string } | null>
    getRecent: () => Promise<Array<{ path: string; name: string; openedAt: string }>>
    addRecent: (filePath: string) => Promise<any[]>
    clearRecent: () => Promise<any[]>
    writeFileToPath: (filePath: string, buffer: Uint8Array) => Promise<boolean>
    aiGenerate: (options: { apiHost: string; apiKey: string; model: string; systemPrompt: string; userPrompt: string }) => Promise<{ ok: boolean; content?: string; error?: string }>

    onMenuNew: (callback: () => void) => () => void
    onMenuSave: (callback: () => void) => () => void
    onMenuExport: (callback: () => void) => () => void
    onMenuImport: (callback: () => void) => () => void
    onOpenAISettings: (callback: () => void) => () => void

    platform: string
  }

  interface Window {
    electronAPI: ElectronAPI
  }
}