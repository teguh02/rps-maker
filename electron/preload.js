const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openFile: () => ipcRenderer.invoke('dialog:open'),
  saveFile: (data) => ipcRenderer.invoke('dialog:save', data),
  saveFileAs: (data) => ipcRenderer.invoke('dialog:save-as', data),
  exportFile: (options) => ipcRenderer.invoke('dialog:export', options),

  onMenuNew: (callback) => ipcRenderer.on('menu-new', callback),
  onMenuSave: (callback) => ipcRenderer.on('menu-save', callback),
  onMenuExport: (callback) => ipcRenderer.on('menu-export', callback),
  onOpenAISettings: (callback) => ipcRenderer.on('open-ai-settings', callback),

  platform: process.platform,
});
