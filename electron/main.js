const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const JSZip = require('jszip');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'RPS Maker UNISINA',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  const menuTemplate = [
    {
      label: 'File',
      submenu: [
        { label: 'New Project', accelerator: 'CmdOrCtrl+N', click: () => mainWindow.webContents.send('menu-new') },
        { label: 'Open...', accelerator: 'CmdOrCtrl+O', click: () => mainWindow.webContents.send('menu-open') },
        { label: 'Save', accelerator: 'CmdOrCtrl+S', click: () => mainWindow.webContents.send('menu-save') },
        { label: 'Save As...', accelerator: 'CmdOrCtrl+Shift+S', click: () => mainWindow.webContents.send('menu-save-as') },
        { type: 'separator' },
        { label: 'Export...', accelerator: 'CmdOrCtrl+E', click: () => mainWindow.webContents.send('menu-export') },
        { type: 'separator' },
        { label: 'Exit', accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Alt+F4', click: () => app.quit() },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { role: 'resetZoom' },
      ],
    },
    {
      label: 'Tools',
      submenu: [
        { label: 'AI Settings', click: () => mainWindow.webContents.send('open-ai-settings') },
      ],
    },
    {
      label: 'Help',
      submenu: [
        { label: 'About RPS Maker', click: () => dialog.showMessageBox(mainWindow, { type: 'info', title: 'About', message: 'RPS Maker UNISINA v1.0.0' }) },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function getRecentPath() {
  const userData = app.getPath('userData');
  return path.join(userData, 'recent.json');
}

function readRecent() {
  const recentPath = getRecentPath();
  if (!fs.existsSync(recentPath)) {
    return [];
  }
  try {
    const data = fs.readFileSync(recentPath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function writeRecent(recent) {
  const recentPath = getRecentPath();
  fs.mkdirSync(path.dirname(recentPath), { recursive: true });
  fs.writeFileSync(recentPath, JSON.stringify(recent, null, 2));
}

ipcMain.handle('dialog:open', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'RPS Files', extensions: ['rps'] }],
  });
  if (result.canceled || result.filePaths.length === 0) return null;

  const filePath = result.filePaths[0];
  const zipData = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(zipData);
  const documentJson = await zip.file('document.json').async('string');

  return {
    filePath,
    data: JSON.parse(documentJson),
  };
});

ipcMain.handle('dialog:save', async (_, data) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    filters: [{ name: 'RPS Files', extensions: ['rps'] }],
    defaultPath: data.defaultName || 'untitled.rps',
  });
  if (result.canceled || !result.filePath) return null;

  const zip = new JSZip();
  zip.file('document.json', JSON.stringify(data.content, null, 2));
  zip.file('metadata.json', JSON.stringify({
    appName: 'RPS Maker UNISINA',
    version: '1.0.0',
    savedAt: new Date().toISOString(),
  }, null, 2));

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
  fs.writeFileSync(result.filePath, zipBuffer);

  const recent = readRecent().filter(r => r.path !== result.filePath);
  recent.unshift({ path: result.filePath, name: path.basename(result.filePath), openedAt: new Date().toISOString() });
  writeRecent(recent.slice(0, 10));

  return result.filePath;
});

ipcMain.handle('dialog:save-as', async (_, data) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    filters: [{ name: 'RPS Files', extensions: ['rps'] }],
    defaultPath: data.defaultName || 'untitled.rps',
  });
  if (result.canceled || !result.filePath) return null;

  const zip = new JSZip();
  zip.file('document.json', JSON.stringify(data.content, null, 2));
  zip.file('metadata.json', JSON.stringify({
    appName: 'RPS Maker UNISINA',
    version: '1.0.0',
    savedAt: new Date().toISOString(),
  }, null, 2));

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
  fs.writeFileSync(result.filePath, zipBuffer);

  const recent = readRecent().filter(r => r.path !== result.filePath);
  recent.unshift({ path: result.filePath, name: path.basename(result.filePath), openedAt: new Date().toISOString() });
  writeRecent(recent.slice(0, 10));

  return result.filePath;
});

ipcMain.handle('project:load', async (_, filePath) => {
  if (!fs.existsSync(filePath)) return null;
  const zipData = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(zipData);
  const documentJson = await zip.file('document.json').async('string');

  const recent = readRecent().filter(r => r.path !== filePath);
  recent.unshift({ path: filePath, name: path.basename(filePath), openedAt: new Date().toISOString() });
  writeRecent(recent.slice(0, 10));

  return {
    filePath,
    data: JSON.parse(documentJson),
  };
});

ipcMain.handle('dialog:export', async (_, { format }) => {
  const filters = {
    pdf: [{ name: 'PDF Files', extensions: ['pdf'] }],
    docx: [{ name: 'Word Documents', extensions: ['docx'] }],
  };
  const result = await dialog.showSaveDialog(mainWindow, {
    filters: filters[format] || [{ name: 'All Files', extensions: ['*'] }],
  });
  if (result.canceled || !result.filePath) return null;
  return { filePath: result.filePath, format };
});

ipcMain.handle('recent:get', () => {
  return readRecent();
});

ipcMain.handle('recent:add', (_, filePath) => {
  const recent = readRecent().filter(r => r.path !== filePath);
  recent.unshift({ path: filePath, name: path.basename(filePath), openedAt: new Date().toISOString() });
  writeRecent(recent.slice(0, 10));
  return recent;
});

ipcMain.handle('recent:clear', () => {
  writeRecent([]);
  return [];
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
