const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'RPS Maker UNISINA',
    icon: path.join(__dirname, '../public/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Development: load from Vite dev server
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // Production: load from dist folder
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Custom menu
  const menuTemplate = [
    {
      label: 'File',
      submenu: [
        { label: 'New Project', accelerator: 'CmdOrCtrl+N', click: () => mainWindow.webContents.send('menu-new') },
        { label: 'Open...', accelerator: 'CmdOrCtrl+O', click: () => handleOpen() },
        { label: 'Save', accelerator: 'CmdOrCtrl+S', click: () => mainWindow.webContents.send('menu-save') },
        { label: 'Save As...', accelerator: 'CmdOrCtrl+Shift+S', click: () => handleSaveAs() },
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

// IPC Handlers
ipcMain.handle('dialog:open', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'RPS Files', extensions: ['rps'] }],
  });
  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0];
    const data = fs.readFileSync(filePath, 'utf-8');
    return { filePath, data: JSON.parse(data) };
  }
  return null;
});

ipcMain.handle('dialog:save', async (_, data) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    filters: [{ name: 'RPS Files', extensions: ['rps'] }],
    defaultPath: data.defaultName || 'untitled.rps',
  });
  if (!result.canceled && result.filePath) {
    fs.writeFileSync(result.filePath, JSON.stringify(data.content, null, 2));
    return result.filePath;
  }
  return null;
});

ipcMain.handle('dialog:save-as', async (_, data) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    filters: [{ name: 'RPS Files', extensions: ['rps'] }],
    defaultPath: data.defaultName || 'untitled.rps',
  });
  if (!result.canceled && result.filePath) {
    fs.writeFileSync(result.filePath, JSON.stringify(data.content, null, 2));
    return result.filePath;
  }
  return null;
});

ipcMain.handle('dialog:export', async (_, { format, data, defaultName }) => {
  const filters = {
    pdf: [{ name: 'PDF Files', extensions: ['pdf'] }],
    docx: [{ name: 'Word Documents', extensions: ['docx'] }],
  };
  const result = await dialog.showSaveDialog(mainWindow, {
    filters: filters[format] || [{ name: 'All Files', extensions: ['*'] }],
    defaultPath: defaultName || `export.${format}`,
  });
  if (!result.canceled && result.filePath) {
    return { filePath: result.filePath, format, data };
  }
  return null;
});

function handleOpen() {
  mainWindow.webContents.send('menu-new');
}

function handleSaveAs() {
  mainWindow.webContents.send('menu-save');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
