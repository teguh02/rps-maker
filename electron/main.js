const { app, BrowserWindow, ipcMain, dialog, nativeImage, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const JSZip = require('jszip');

// Simple logger for main process
function getTimestamp() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

const log = {
  info: (module, message, data) => {
    const suffix = data ? ' ' + JSON.stringify(data) : '';
    console.log(`[${getTimestamp()}] [INFO] [${module}] ${message}${suffix}`);
  },
  debug: (module, message, data) => {
    const suffix = data ? ' ' + JSON.stringify(data) : '';
    console.debug(`[${getTimestamp()}] [DEBUG] [${module}] ${message}${suffix}`);
  },
  error: (module, message, data) => {
    const suffix = data ? ' ' + JSON.stringify(data) : '';
    console.error(`[${getTimestamp()}] [ERROR] [${module}] ${message}${suffix}`);
  },
};

let mainWindow;

function createWindow() {
  const iconPath = path.join(__dirname, '../build/icon.png');
  
  // Set app icon for taskbar/window
  try {
    if (fs.existsSync(iconPath)) {
      app.setIcon(iconPath);
    }
  } catch (e) { /* ignore */ }

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1200,
    minHeight: 800,
    show: false,
    title: 'RPS Maker UNISINA',
    autoHideMenuBar: true,
    icon: iconPath,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.maximize();
  mainWindow.show();
  mainWindow.setMenuBarVisibility(false);

  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/* ── Fullscreen toggle (maximize/unmaximize) ── */
ipcMain.handle('window:toggle-fullscreen', () => {
  if (!mainWindow) return false;
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
    return false;
  } else {
    mainWindow.maximize();
    return true;
  }
});

ipcMain.handle('window:is-fullscreen', () => {
  if (!mainWindow) return false;
  return mainWindow.isMaximized();
});

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
  log.info('IPC', 'dialog:open');
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'RPS Files', extensions: ['rps'] }],
  });
  if (result.canceled || result.filePaths.length === 0) {
    log.debug('IPC', 'dialog:open_canceled');
    return null;
  }

  const filePath = result.filePaths[0];
  log.debug('IPC', 'dialog:open_file', { filePath });
  const zipData = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(zipData);
  const documentJson = await zip.file('document.json').async('string');

  return {
    filePath,
    data: JSON.parse(documentJson),
  };
});

async function writeRpsZip(filePath, content) {
  const zip = new JSZip();
  zip.file('document.json', JSON.stringify(content, null, 2));
  zip.file('metadata.json', JSON.stringify({
    appName: 'RPS Maker UNISINA',
    version: '1.0.0',
    savedAt: new Date().toISOString(),
  }, null, 2));
  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
  fs.writeFileSync(filePath, zipBuffer);
}

ipcMain.handle('dialog:save', async (_, data) => {
  log.info('IPC', 'dialog:save');
  const result = await dialog.showSaveDialog(mainWindow, {
    filters: [{ name: 'RPS Files', extensions: ['rps'] }],
    defaultPath: data.defaultName || 'untitled.rps',
  });
  if (result.canceled || !result.filePath) {
    log.debug('IPC', 'dialog:save_canceled');
    return null;
  }

  log.debug('IPC', 'dialog:save_file', { filePath: result.filePath });
  await writeRpsZip(result.filePath, data.content);

  const recent = readRecent().filter(r => r.path !== result.filePath);
  recent.unshift({ path: result.filePath, name: path.basename(result.filePath), openedAt: new Date().toISOString() });
  writeRecent(recent.slice(0, 10));

  return result.filePath;
});

// Silent save — writes straight to an existing filePath without showing a dialog.
// Used by the auto-save feature (only active after the user has saved manually once).
ipcMain.handle('project:save-silent', async (_, filePath, content) => {
  if (!filePath || !content) {
    log.warn('IPC', 'project:save-silent_skipped', { hasPath: !!filePath, hasContent: !!content });
    return false;
  }
  log.debug('IPC', 'project:save-silent', { filePath, size: Object.keys(content).length });
  try {
    await writeRpsZip(filePath, content);
    return true;
  } catch (err) {
    log.error('IPC', 'project:save-silent_error', { error: err.message });
    return false;
  }
});

ipcMain.handle('dialog:save-as', async (_, data) => {
  log.info('IPC', 'dialog:save-as');
  const result = await dialog.showSaveDialog(mainWindow, {
    filters: [{ name: 'RPS Files', extensions: ['rps'] }],
    defaultPath: data.defaultName || 'untitled.rps',
  });
  if (result.canceled || !result.filePath) {
    log.debug('IPC', 'dialog:save-as_canceled');
    return null;
  }

  log.debug('IPC', 'dialog:save-as_file', { filePath: result.filePath });
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
  log.info('IPC', 'project:load', { filePath });
  if (!fs.existsSync(filePath)) {
    log.error('IPC', 'project:load_not_found', { filePath });
    return null;
  }
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
  log.info('IPC', 'dialog:export', { format });
  const filters = {
    pdf: [{ name: 'PDF Files', extensions: ['pdf'] }],
    docx: [{ name: 'Word Documents', extensions: ['docx'] }],
  };
  const result = await dialog.showSaveDialog(mainWindow, {
    filters: filters[format] || [{ name: 'All Files', extensions: ['*'] }],
  });
  if (result.canceled || !result.filePath) {
    log.debug('IPC', 'dialog:export_canceled', { format });
    return null;
  }
  log.debug('IPC', 'dialog:export_file', { filePath: result.filePath, format });
  return { filePath: result.filePath, format };
});

ipcMain.handle('recent:get', () => {
  const recent = readRecent();
  log.debug('IPC', 'recent:get', { count: recent.length });
  return recent;
});

ipcMain.handle('recent:add', (_, filePath) => {
  log.debug('IPC', 'recent:add', { filePath });
  const recent = readRecent().filter(r => r.path !== filePath);
  recent.unshift({ path: filePath, name: path.basename(filePath), openedAt: new Date().toISOString() });
  writeRecent(recent.slice(0, 10));
  return recent;
});

ipcMain.handle('file:write', async (_, filePath, buffer) => {
  log.debug('IPC', 'file:write', { filePath, size: buffer.byteLength });
  fs.writeFileSync(filePath, Buffer.from(buffer));
  return true;
});

ipcMain.handle('recent:clear', () => {
  log.info('IPC', 'recent:clear');
  writeRecent([]);
  return [];
});

// Print an HTML document (the exact Preview HTML) to a PDF file using Chromium's
// own print engine. This is far more reliable than html2canvas + jsPDF.
ipcMain.handle('pdf:export-html', async (event, filePath, html) => {
  if (typeof filePath !== 'string' || typeof html !== 'string') {
    log.error('IPC', 'pdf:export-html_bad_args', { filePath, hasHtml: typeof html === 'string' });
    return false;
  }
  let tmpFile = null;
  let win = null;
  try {
    tmpFile = path.join(app.getPath('temp'), `rps-print-${Date.now()}.html`);
    fs.writeFileSync(tmpFile, html, 'utf-8');

    win = new BrowserWindow({
      show: false,
      width: 794,
      height: 1123,
      webPreferences: { offscreen: false, sandbox: true, contextIsolation: true },
    });
    await win.loadFile(tmpFile);
    // Let the layout/type settle before printing.
    await new Promise((resolve) => setTimeout(resolve, 400));

    const pdfBuffer = await win.webContents.printToPDF({
      printBackground: true,
      preferCSSPageSize: true,
    });
    fs.writeFileSync(filePath, pdfBuffer);
    log.info('IPC', 'pdf:export-html_done', { filePath, bytes: pdfBuffer.byteLength });
    return true;
  } catch (err) {
    log.error('IPC', 'pdf:export-html_error', { filePath, error: err.message });
    return false;
  } finally {
    if (win && !win.isDestroyed()) win.destroy();
    if (tmpFile) {
      try { fs.unlinkSync(tmpFile); } catch (e) { /* ignore */ }
    }
  }
});

ipcMain.handle('ai:generate', async (_, { apiHost, apiKey, model, systemPrompt, userPrompt }) => {
  log.info('IPC', 'ai:generate', { apiHost, model, promptLength: userPrompt.length });
  
  // Normalize URL
  let baseUrl = apiHost.replace(/\/+$/, '');
  baseUrl = baseUrl.replace(/(\/v1)+$/, '/v1');
  if (!baseUrl.endsWith('/v1')) baseUrl += '/v1';
  
  const url = `${baseUrl}/chat/completions`;
  log.debug('IPC', 'ai:generate_url', { url });
  
  const body = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.7,
    max_tokens: 4000,
  };

  // Enable OpenRouter web search plugin so the AI can pull up-to-date references
  // from the internet — even when using free models.
  if (baseUrl.includes('openrouter.ai')) {
    body.plugins = [
      {
        id: 'web',
        max_results: 5,
        search_prompt: 'Gunakan hasil pencarian web berikut sebagai sumber referensi untuk menyusun jawaban. Jika mengutip, sebutkan sumbernya.',
      },
    ];
    log.debug('IPC', 'ai:generate_web_search_enabled');
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    log.debug('IPC', 'ai:generate_raw_response', { status: response.status, length: text.length });
    
    // Try to parse JSON, handling cases where response might have extra content
    let data;
    try {
      data = JSON.parse(text);
    } catch (parseErr) {
      // Try to find valid JSON by finding matching braces
      const firstBrace = text.indexOf('{');
      if (firstBrace >= 0) {
        let depth = 0;
        let endPos = firstBrace;
        for (let i = firstBrace; i < text.length; i++) {
          if (text[i] === '{') depth++;
          else if (text[i] === '}') depth--;
          if (depth === 0) {
            endPos = i + 1;
            break;
          }
        }
        try {
          data = JSON.parse(text.substring(firstBrace, endPos));
          log.debug('IPC', 'ai:generate_extracted_json', { extracted: true });
        } catch {
          log.error('IPC', 'ai:generate_parse_error', { error: parseErr.message, preview: text.substring(0, 500) });
          return { ok: false, error: `Invalid response format` };
        }
      } else {
        log.error('IPC', 'ai:generate_parse_error', { error: parseErr.message, preview: text.substring(0, 500) });
        return { ok: false, error: `Invalid response format` };
      }
    }
    
    if (!response.ok) {
      const errorMsg = data.error?.message || `HTTP ${response.status}`;
      log.error('IPC', 'ai:generate_api_error', { status: response.status, error: errorMsg });
      return { ok: false, error: errorMsg };
    }

    const content = data.choices?.[0]?.message?.content || '';
    log.info('IPC', 'ai:generate_success', { responseLength: content.length });
    return { ok: true, content };
  } catch (err) {
    log.error('IPC', 'ai:generate_error', { error: err.message });
    return { ok: false, error: err.message };
  }
});

// Send an event to the renderer only while the window exists.
function sendToRenderer(event, ...args) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(event, ...args);
  }
}

function buildAppMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac ? [{ role: 'appMenu' }] : []),
    {
      label: 'File',
      submenu: [
        { label: 'New Project', accelerator: 'CommandOrControl+N', click: () => sendToRenderer('menu-new') },
        { label: 'Open Project...', accelerator: 'CommandOrControl+O', click: () => sendToRenderer('menu-open') },
        { type: 'separator' },
        { label: 'Save', accelerator: 'CommandOrControl+S', click: () => sendToRenderer('menu-save') },
        { label: 'Save As...', accelerator: 'CommandOrControl+Shift+S', click: () => sendToRenderer('menu-save-as') },
        { type: 'separator' },
        { label: 'Import Kurikulum...', accelerator: 'CommandOrControl+Shift+I', click: () => sendToRenderer('menu-import') },
        { type: 'separator' },
        { label: 'Export Word...', accelerator: 'CommandOrControl+Shift+E', click: () => sendToRenderer('menu-export', 'docx') },
        { label: 'Export PDF...', accelerator: 'CommandOrControl+P', click: () => sendToRenderer('menu-export', 'pdf') },
        { label: 'Export...', accelerator: 'CommandOrControl+E', click: () => sendToRenderer('menu-export') },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit', label: 'Exit' },
      ],
    },
  ];
  return Menu.buildFromTemplate(template);
}

app.whenReady().then(() => {
  createWindow();

  // Hidden application menu: accelerators work only while this app is focused
  // (unlike globalShortcut which was system-wide). The menu bar stays hidden
  // because the app uses its own ribbon UI.
  Menu.setApplicationMenu(buildAppMenu());
  log.info('APP', 'menu_installed', { platform: process.platform });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
