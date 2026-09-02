const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openFile: () => ipcRenderer.invoke('dialog:open'),
  openProject: (filePath: string) => ipcRenderer.invoke('project:load', filePath),
  saveFile: (data) => ipcRenderer.invoke('dialog:save', data),
  saveFileAs: (data) => ipcRenderer.invoke('dialog:save-as', data),
  exportFile: (options) => ipcRenderer.invoke('dialog:export', options),
  getRecent: () => ipcRenderer.invoke('recent:get'),
  addRecent: (filePath) => ipcRenderer.invoke('recent:add', filePath),
  clearRecent: () => ipcRenderer.invoke('recent:clear'),
  writeFileToPath: (filePath, buffer) => ipcRenderer.invoke('file:write', filePath, buffer),

  onMenuNew: (callback) => ipcRenderer.on('menu-new', callback),
  onMenuSave: (callback) => ipcRenderer.on('menu-save', callback),
  onMenuExport: (callback) => ipcRenderer.on('menu-export', callback),
  onMenuImport: (callback) => ipcRenderer.on('menu-import', callback),
  onOpenAISettings: (callback) => ipcRenderer.on('open-ai-settings', callback),

  platform: process.platform,
});