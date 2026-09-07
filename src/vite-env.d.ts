/// <reference types="vite/client" />

export {}

declare global {
  /** Real app version from package.json, injected at build time by Vite. */
  const __APP_VERSION__: string

  interface UpdateCheckResult {
    status: 'update-available' | 'up-to-date' | 'error'
    currentVersion: string
    version?: string
    tag?: string
    notes?: string
    url?: string
    publishedAt?: string
    error?: string
    assets?: Array<{ name: string; url: string; size: number }>
  }

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
    exportPdfHtml: (filePath: string, html: string) => Promise<boolean>
    aiGenerate: (options: { apiHost: string; apiKey: string; model: string; systemPrompt: string; userPrompt: string }) => Promise<{ ok: boolean; content?: string; error?: string }>

    onMenuNew: (callback: () => void) => () => void
    onMenuOpen: (callback: () => void) => () => void
    onMenuSave: (callback: () => void) => () => void
    onMenuSaveAs: (callback: () => void) => () => void
    onMenuExport: (callback: (format?: string) => void) => () => void
    onMenuImport: (callback: () => void) => () => void
    onOpenAISettings: (callback: () => void) => () => void

    checkForUpdates: (force?: boolean) => Promise<UpdateCheckResult>
    installUpdate: () => Promise<{ ok: boolean; dev?: boolean; action?: string; error?: string }>
    onUpdateProgress: (callback: (data: { received: number; total: number; percent: number }) => void) => () => void

    platform: string
  }

  interface Window {
    electronAPI: ElectronAPI
  }
}