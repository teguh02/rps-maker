const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openFile: () => ipcRenderer.invoke('dialog:open'),
  openProject: (filePath) => ipcRenderer.invoke('project:load', filePath),
  saveFile: (data) => ipcRenderer.invoke('dialog:save', data),
  saveFileAs: (data) => ipcRenderer.invoke('dialog:save-as', data),
  saveProjectSilent: (filePath, content) => ipcRenderer.invoke('project:save-silent', filePath, content),
  exportFile: (options) => ipcRenderer.invoke('dialog:export', options),
  getRecent: () => ipcRenderer.invoke('recent:get'),
  addRecent: (filePath) => ipcRenderer.invoke('recent:add', filePath),
  clearRecent: () => ipcRenderer.invoke('recent:clear'),
  writeFileToPath: (filePath, buffer) => ipcRenderer.invoke('file:write', filePath, buffer),
  exportPdfHtml: (filePath, html) => ipcRenderer.invoke('pdf:export-html', filePath, html),
  aiGenerate: (options) => ipcRenderer.invoke('ai:generate', options),
  toggleFullscreen: () => ipcRenderer.invoke('window:toggle-fullscreen'),
  isFullscreen: () => ipcRenderer.invoke('window:is-fullscreen'),

  onMenuNew: (callback) => { ipcRenderer.on('menu-new', callback); return () => ipcRenderer.removeListener('menu-new', callback); },
  onMenuOpen: (callback) => { ipcRenderer.on('menu-open', callback); return () => ipcRenderer.removeListener('menu-open', callback); },
  onMenuSave: (callback) => { ipcRenderer.on('menu-save', callback); return () => ipcRenderer.removeListener('menu-save', callback); },
  onMenuSaveAs: (callback) => { ipcRenderer.on('menu-save-as', callback); return () => ipcRenderer.removeListener('menu-save-as', callback); },
  onMenuExport: (callback) => { const listener = (_e, format) => callback(format); ipcRenderer.on('menu-export', listener); return () => ipcRenderer.removeListener('menu-export', listener); },
  onMenuImport: (callback) => { ipcRenderer.on('menu-import', callback); return () => ipcRenderer.removeListener('menu-import', callback); },
  onOpenAISettings: (callback) => { ipcRenderer.on('open-ai-settings', callback); return () => ipcRenderer.removeListener('open-ai-settings', callback); },

  masterBerkasLoad: () => ipcRenderer.invoke('master-berkas:load'),
  masterBerkasSave: (data) => ipcRenderer.invoke('master-berkas:save', data),
  masterBerkasExtract: (options) => ipcRenderer.invoke('master-berkas:extract', options),

  checkForUpdates: (force) => ipcRenderer.invoke('updates:check', force),
  installUpdate: () => ipcRenderer.invoke('updates:install'),
  onUpdateProgress: (callback) => { const listener = (_e, data) => callback(data); ipcRenderer.on('updates:download-progress', listener); return () => ipcRenderer.removeListener('updates:download-progress', listener); },

  libreOfficeCheck: () => ipcRenderer.invoke('libreoffice:check'),
  libreOfficeEnsure: () => ipcRenderer.invoke('libreoffice:ensure'),
  exportDocxViaLibreOffice: (options) => ipcRenderer.invoke('docx:export-via-libreoffice', options),
  onLibreOfficeStatus: (callback) => { const listener = (_e, data) => callback(data); ipcRenderer.on('libreoffice:status', listener); return () => ipcRenderer.removeListener('libreoffice:status', listener); },

  platform: process.platform,
});