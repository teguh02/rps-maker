const { app, BrowserWindow, ipcMain, dialog, nativeImage, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const { spawn } = require('child_process');
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

ipcMain.handle('dialog:export', async (_, { format, defaultName }) => {
  log.info('IPC', 'dialog:export', { format, defaultName });
  const filters = {
    pdf: [{ name: 'PDF Files', extensions: ['pdf'] }],
    docx: [{ name: 'Word Documents', extensions: ['docx'] }],
  };
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName || `export.${format}`,
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
  log.info('IPC', 'pdf:export-html');
  if (!filePath || typeof html !== 'string') {
    log.error('IPC', 'pdf:export-html_bad_args', { filePath, hasHtml: typeof html === 'string' });
    return false;
  }

  let finalPath = filePath;
  const lower = filePath.toLowerCase();
  if (!lower.endsWith('.pdf')) {
    const idx = lower.lastIndexOf('.');
    finalPath = idx >= 0 ? filePath.substring(0, idx) + '.pdf' : filePath + '.pdf';
  }

  // Write to a simple temp file
  const tmpHtml = path.join(app.getPath('temp'), 'rps-export.html');
  fs.writeFileSync(tmpHtml, html, 'utf-8');
  log.debug('IPC', 'pdf:export-html_written', { tmpHtml, size: html.length });

  let pdfBuffer;
  const tmpWin = new BrowserWindow({
    width: 1200, height: 900, show: false,
    webPreferences: { webSecurity: false },
  });
  try {
    const fileUrl = 'file://' + tmpHtml.replace(/\\/g, '/');
    log.debug('IPC', 'pdf:export-html_loading', { fileUrl });
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('load-timeout')), 30000);
      tmpWin.webContents.once('did-finish-load', () => { clearTimeout(timer); resolve(); });
      tmpWin.webContents.once('did-fail-load', (_e, code, desc) => { clearTimeout(timer); reject(new Error(`fail ${code}: ${desc}`)); });
      tmpWin.loadURL(fileUrl);
    });
    log.debug('IPC', 'pdf:export-html_loaded');
    // Wait a bit for rendering to complete
    await new Promise(r => setTimeout(r, 1000));
    pdfBuffer = await tmpWin.webContents.printToPDF({ landscape: true, preferCSSPageSize: true });
    log.debug('IPC', 'pdf:export-html_printed', { bytes: pdfBuffer.byteLength });
  } catch (e) {
    log.error('IPC', 'pdf:export-html_print_failed', { error: e instanceof Error ? e.message : String(e) });
    throw e;
  } finally {
    tmpWin.destroy();
    try { fs.unlinkSync(tmpHtml); } catch {}
  }

  fs.writeFileSync(finalPath, pdfBuffer);
  log.info('IPC', 'pdf:export-html_done', { filePath: finalPath, bytes: pdfBuffer.byteLength });
  return true;
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

/* ─────────────────────────────────────────────────────────────
 * In-app update checker (GitHub Releases)
 * ─────────────────────────────────────────────────────────────
 * Releases are created by .github/workflows/build-release.yml on
 * branch `build`. The repo is public, so no token is needed for
 * the GitHub API. Version on GitHub must match package.json (the
 * release pipeline bumps it before building).
 */
const UPDATE_SOURCE = { owner: 'teguh02', repo: 'rps-maker' };
const UPDATE_CACHE_TTL_MS = 60 * 1000;
let updateCache = { at: 0, result: null };

function parseVersion(v) {
  const m = String(v).replace(/^v/i, '').match(/(\d+)\.(\d+)\.(\d+)/);
  return m ? m.slice(1).map((n) => parseInt(n, 10)) : null;
}

function isNewer(a, b) {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  if (!pa || !pb) return false;
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] > pb[i];
  }
  return false;
}

function githubGetJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'RPS-Maker-UNISINA',
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        if (res.statusCode !== 200) {
          return reject(new Error(`GitHub API HTTP ${res.statusCode}`));
        }
        try {
          resolve(JSON.parse(body));
        } catch (err) {
          reject(err);
        }
      });
    });
    req.on('error', reject);
  });
}

async function checkForUpdates(force) {
  if (!force && updateCache.result && Date.now() - updateCache.at < UPDATE_CACHE_TTL_MS) {
    return updateCache.result;
  }
  try {
    const url = `https://api.github.com/repos/${UPDATE_SOURCE.owner}/${UPDATE_SOURCE.repo}/releases/latest`;
    const release = await githubGetJson(url);
    const current = app.getVersion();
    const remote = String(release.tag_name || '').replace(/^v/i, '');
    const result = {
      status: isNewer(remote, current) ? 'update-available' : 'up-to-date',
      currentVersion: current,
      version: remote || '',
      tag: release.tag_name || '',
      notes: release.body || '',
      url: release.html_url || '',
      publishedAt: release.published_at || '',
      assets: (release.assets || []).map((a) => ({ name: a.name, url: a.browser_download_url, size: a.size || 0 })),
    };
    updateCache = { at: Date.now(), result };
    log.info('UPDATER', 'check_done', { current, remote, status: result.status });
    return result;
  } catch (err) {
    log.error('UPDATER', 'check_error', { error: err.message });
    return { status: 'error', currentVersion: app.getVersion(), error: err.message };
  }
}

// Pick the installer asset for the current platform (Windows → .exe, macOS → .dmg).
function pickInstallerAsset(assets) {
  if (!assets || !assets.length) return null;
  const isWin = process.platform === 'win32';
  const isMac = process.platform === 'darwin';
  const pool = assets.filter((a) =>
    isWin ? /\.exe$/i.test(a.name) : isMac ? /\.dmg$/i.test(a.name) : false
  );
  if (!pool.length) return null;
  pool.sort((a, b) => (b.size || 0) - (a.size || 0));
  return pool[0];
}

// Stream a release asset to disk, following redirects and reporting progress.
function downloadFile(url, destPath, onProgress) {
  return new Promise((resolve, reject) => {
    const doGet = (currentUrl, hops) => {
      if (hops > 5) return reject(new Error('Terlalu banyak redirect'));
      const req = https.get(currentUrl, { headers: { 'User-Agent': 'RPS-Maker-UNISINA' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          return doGet(res.headers.location, hops + 1);
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`Download HTTP ${res.statusCode}`));
        }
        const total = parseInt(res.headers['content-length'] || '0', 10);
        let received = 0;
        const file = fs.createWriteStream(destPath);
        file.on('error', (err) => { req.destroy(); reject(err); });
        res.on('data', (chunk) => {
          received += chunk.length;
          if (onProgress && total > 0) onProgress(received, total);
        });
        res.pipe(file);
        file.on('finish', () => file.close(() => {
          if (onProgress) onProgress(received, total || received);
          resolve(destPath);
        }));
      });
      req.on('error', (err) => {
        try { fs.unlinkSync(destPath); } catch (e) { /* ignore */ }
        reject(err);
      });
    };
    doGet(url, 0);
  });
}

ipcMain.handle('updates:check', async (_, force) => {
  return checkForUpdates(!!force);
});

// Download the newest installer and run it. In dev mode there is nothing to
// install, so the release page is opened in the browser instead (useful to
// test the banner flow).
ipcMain.handle('updates:install', async () => {
  const info = await checkForUpdates(true);
  if (info.status !== 'update-available') {
    return { ok: false, error: 'Tidak ada pembaruan yang tersedia.' };
  }

  if (!app.isPackaged) {
    log.info('UPDATER', 'dev_mode_open_release', { url: info.url });
    await shell.openExternal(info.url);
    return { ok: true, dev: true };
  }

  const asset = pickInstallerAsset(info.assets);
  if (!asset) {
    return { ok: false, error: 'Installer untuk platform ini tidak ditemukan di rilis.' };
  }

  const ext = process.platform === 'win32' ? '.exe' : '.dmg';
  const destPath = path.join(app.getPath('temp'), `rps-maker-update-${Date.now()}${ext}`);
  log.info('UPDATER', 'download_start', { name: asset.name, size: asset.size, dest: destPath });

  try {
    await downloadFile(asset.url, destPath, (received, total) => {
      const percent = Math.min(100, Math.round((received / total) * 100));
      sendToRenderer('updates:download-progress', { received, total, percent });
    });
    log.info('UPDATER', 'download_done', { dest: destPath });
  } catch (err) {
    log.error('UPDATER', 'download_error', { error: err.message });
    try { fs.unlinkSync(destPath); } catch (e) { /* ignore */ }
    return { ok: false, error: err.message };
  }

  if (process.platform === 'win32') {
    // Launch the NSIS installer (silent one-click) detached, then close the app
    // so the new version can be installed & started cleanly.
    log.info('UPDATER', 'launch_installer', { dest: destPath });
    const child = spawn(destPath, [], { detached: true, stdio: 'ignore' });
    child.unref();
    setTimeout(() => { app.quit(); }, 1500);
    return { ok: true, action: 'quit' };
  }

  if (process.platform === 'darwin') {
    // Open the DMG in Finder; the user drags the app to Applications.
    log.info('UPDATER', 'open_dmg', { dest: destPath });
    const err = await shell.openPath(destPath);
    if (err) return { ok: false, error: err };
    return { ok: true, action: 'opened' };
  }

  return { ok: false, error: `Platform ${process.platform} belum didukung auto-update.` };
});

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

/* ── Master Berkas: file-based RAG storage ── */
const mammoth = require('mammoth');
const XLSX = require('xlsx');
const crypto = require('crypto');

function getMasterBerkasPath() {
  return path.join(app.getPath('userData'), 'master-berkas.json');
}

function readMasterBerkas() {
  const filePath = getMasterBerkasPath();
  if (!fs.existsSync(filePath)) return { groups: [], activeGroupId: null };
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return { groups: [], activeGroupId: null };
  }
}

function writeMasterBerkas(data) {
  fs.writeFileSync(getMasterBerkasPath(), JSON.stringify(data, null, 2), 'utf-8');
}

async function extractFileContent(buffer, extension) {
  const ext = extension.toLowerCase();
  if (ext === '.pdf') {
    const { PDFParse } = require('pdf-parse');
    const parser = new PDFParse({ data: buffer });
    await parser.load();
    const result = await parser.getText();
    return result.text || '';
  }
  if (ext === '.docx') {
    const result = await mammoth.extractRawText({ buffer });
    return result.value || '';
  }
  if (ext === '.csv') {
    return buffer.toString('utf-8').replace(/^\uFEFF/, '');
  }
  if (ext === '.xlsx') {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    if (!workbook.SheetNames.length) return '';
    const allText = workbook.SheetNames.map(name => {
      const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[name]);
      return `--- Sheet: ${name} ---\n${csv}`;
    }).join('\n\n');
    return allText;
  }
  throw new Error(`Unsupported file type: ${ext}`);
}

ipcMain.handle('master-berkas:load', () => {
  log.info('MASTER_BERKAS', 'load');
  return readMasterBerkas();
});

ipcMain.handle('master-berkas:save', (_event, data) => {
  log.info('MASTER_BERKAS', 'save', { groups: data.groups?.length });
  writeMasterBerkas(data);
  return true;
});

ipcMain.handle('master-berkas:extract', async (_event, { buffer, fileName }) => {
  log.info('MASTER_BERKAS', 'extract', { fileName });
  try {
    const ext = path.extname(fileName);
    const uint8 = new Uint8Array(buffer);
    const extractedText = await extractFileContent(Buffer.from(uint8), ext);
    log.info('MASTER_BERKAS', 'extract_done', { fileName, textLength: extractedText.length });
    return { ok: true, extractedText, fileName };
  } catch (err) {
    log.error('MASTER_BERKAS', 'extract_error', { fileName, error: err.message });
    return { ok: false, error: err.message };
  }
});

// ── LibreOffice detection, download, and PDF→DOCX conversion ──────────────

const LIBRE_OFFICE_VERSION = '25.2.4';
const LIBRE_OFFICE_DIR = path.join(app.getPath('temp'), 'libreoffice-portable');

function getLibreOfficePaths() {
  const platform = process.platform;
  if (platform === 'win32') {
    const candidates = [
      'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
      'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
      path.join(process.env.LOCALAPPDATA || '', 'LibreOffice\\program\\soffice.exe'),
      path.join(process.env.PROGRAMFILES || '', 'LibreOffice\\program\\soffice.exe'),
    ];
    // Also check portable location
    candidates.push(path.join(LIBRE_OFFICE_DIR, 'program', 'soffice.exe'));
    return candidates;
  }
  if (platform === 'darwin') {
    return [
      '/Applications/LibreOffice.app/Contents/MacOS/soffice',
    ];
  }
  // Linux
  return [
    '/usr/bin/soffice',
    '/usr/bin/libreoffice',
    '/snap/bin/libreoffice',
    '/usr/local/bin/soffice',
  ];
}

async function detectLibreOffice() {
  const paths = getLibreOfficePaths();
  for (const p of paths) {
    if (fs.existsSync(p)) {
      log.info('LIBRE', 'detected', { path: p });
      return p;
    }
  }
  // Try PATH
  return new Promise((resolve) => {
    const cmd = process.platform === 'win32' ? 'where soffice' : 'which soffice';
    const child = spawn(cmd, { shell: true, stdio: 'pipe' });
    let stdout = '';
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.on('close', (code) => {
      if (code === 0 && stdout.trim()) {
        const found = stdout.trim().split('\n')[0].trim();
        log.info('LIBRE', 'detected_in_path', { path: found });
        resolve(found);
      } else {
        resolve(null);
      }
    });
    child.on('error', () => resolve(null));
  });
}

function getLibreOfficeDownloadUrl() {
  const platform = process.platform;
  if (platform === 'win32') {
    return `https://download.documentfoundation.org/libreoffice/stable/${LIBRE_OFFICE_VERSION}/win/x86_64/LibreOffice_${LIBRE_OFFICE_VERSION}_Win_x86-64.msi`;
  }
  if (platform === 'darwin') {
    const arch = process.arch === 'arm64' ? 'aarch64' : 'x86_64';
    return `https://download.documentfoundation.org/libreoffice/stable/${LIBRE_OFFICE_VERSION}/mac/${arch}/LibreOffice_${LIBRE_OFFICE_VERSION}_MacOS_${arch}.dmg`;
  }
  // Linux — DEB for Debian/Ubuntu
  return `https://download.documentfoundation.org/libreoffice/stable/${LIBRE_OFFICE_VERSION}/linux_x86-64/LibreOffice_${LIBRE_OFFICE_VERSION}_Linux_x86-64_deb.tar.gz`;
}

function getInstallerPath() {
  const platform = process.platform;
  const base = path.join(LIBRE_OFFICE_DIR);
  if (platform === 'win32') {
    return path.join(base, 'installer.msi');
  }
  if (platform === 'darwin') {
    return path.join(base, 'installer.dmg');
  }
  return path.join(base, 'installer.tar.gz');
}

function downloadFile(url, destPath, onProgress) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    const request = (downloadUrl) => {
      const proto = downloadUrl.startsWith('https') ? https : require('http');
      proto.get(downloadUrl, { headers: { 'User-Agent': 'RPS-Maker/1.0' } }, (response) => {
        // Follow redirects
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          request(response.headers.location);
          return;
        }
        if (response.statusCode !== 200) {
          file.close();
          fs.unlinkSync(destPath);
          reject(new Error(`HTTP ${response.statusCode}`));
          return;
        }
        const totalBytes = parseInt(response.headers['content-length'] || '0', 10);
        let downloaded = 0;
        response.on('data', (chunk) => {
          downloaded += chunk.length;
          if (onProgress && totalBytes > 0) {
            onProgress({ downloaded, totalBytes, percent: Math.round((downloaded / totalBytes) * 100) });
          }
        });
        response.pipe(file);
        file.on('finish', () => { file.close(); resolve(); });
      }).on('error', (err) => {
        file.close();
        fs.unlinkSync(destPath);
        reject(err);
      });
    };
    request(url);
  });
}

async function installLibreOfficeWindows(msiPath) {
  log.info('LIBRE', 'installing_windows', { msiPath });
  return new Promise((resolve, reject) => {
    // Silent install to user-local directory to avoid needing admin
    const installDir = path.join(LIBRE_OFFICE_DIR, 'app');
    const args = [
      '/i', msiPath,
      '/qn',  // quiet, no UI
      `/INSTALLDIR=${installDir}`,
      'SELECT_SHORTCUT=0', 'SELECT_DESKTOP_SHORTCUT=0',
      'ADDLOCAL=ALL',
    ];
    const child = spawn('msiexec.exe', args, { stdio: 'pipe' });
    let stderr = '';
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('close', (code) => {
      if (code === 0) {
        const soffice = path.join(installDir, 'program', 'soffice.exe');
        if (fs.existsSync(soffice)) {
          log.info('LIBRE', 'installed_windows', { path: soffice });
          resolve(soffice);
        } else {
          reject(new Error('Install selesai tapi soffice.exe tidak ditemukan.'));
        }
      } else {
        reject(new Error(`MSI install gagal (code ${code}): ${stderr}`));
      }
    });
    child.on('error', reject);
  });
}

async function installLibreOfficeDarwin(dmgPath) {
  log.info('LIBRE', 'installing_darwin', { dmgPath });
  // Mount DMG, copy .app to /Applications
  return new Promise((resolve, reject) => {
    const mountPoint = '/Volumes/LibreOffice';
    spawn('hdiutil', ['attach', dmgPath, '-nobrowse', '-quiet'], { stdio: 'pipe' }).on('close', (code) => {
      if (code !== 0) return reject(new Error('Gagal mount DMG'));
      const appSrc = path.join(mountPoint, 'LibreOffice.app');
      const appDest = '/Applications/LibreOffice.app';
      spawn('cp', ['-R', appSrc, appDest], { stdio: 'pipe' }).on('close', (code2) => {
        spawn('hdiutil', ['detach', mountPoint, '-quiet'], { stdio: 'pipe' }).on('close', () => {
          if (code2 === 0 && fs.existsSync(appDest)) {
            const soffice = path.join(appDest, 'Contents', 'MacOS', 'soffice');
            log.info('LIBRE', 'installed_darwin', { path: soffice });
            resolve(soffice);
          } else {
            reject(new Error('Gagal copy LibreOffice.app ke /Applications'));
          }
        });
      });
    });
  });
}

async function installLibreOfficeLinux(tarPath) {
  log.info('LIBRE', 'installing_linux', { tarPath });
  const extractDir = path.join(LIBRE_OFFICE_DIR, 'app');
  fs.mkdirSync(extractDir, { recursive: true });
  return new Promise((resolve, reject) => {
    spawn('tar', ['-xzf', tarPath, '-C', extractDir, '--strip-components=1'], { stdio: 'pipe' }).on('close', (code) => {
      if (code !== 0) return reject(new Error('Gagal ekstrak tar.gz'));
      const soffice = path.join(extractDir, 'program', 'soffice');
      if (fs.existsSync(soffice)) {
        fs.chmodSync(soffice, 0o755);
        log.info('LIBRE', 'installed_linux', { path: soffice });
        resolve(soffice);
      } else {
        reject(new Error('soffice tidak ditemukan setelah ekstrak'));
      }
    });
  });
}

async function ensureLibreOffice(mainWindow) {
  // 1. Detect existing installation
  const detected = await detectLibreOffice();
  if (detected) return { sofficePath: detected, installed: false };

  // 2. Not found — download and install
  log.info('LIBRE', 'not_found_starting_download');
  if (mainWindow) {
    mainWindow.webContents.send('libreoffice:status', { status: 'downloading', percent: 0 });
  }

  const url = getLibreOfficeDownloadUrl();
  const installerPath = getInstallerPath();
  fs.mkdirSync(path.dirname(installerPath), { recursive: true });

  try {
    await downloadFile(url, installerPath, (progress) => {
      log.debug('LIBRE', 'download_progress', progress);
      if (mainWindow) {
        mainWindow.webContents.send('libreoffice:status', { status: 'downloading', ...progress });
      }
    });
  } catch (err) {
    log.error('LIBRE', 'download_failed', { error: err.message });
    throw new Error(`Gagal mengunduh LibreOffice: ${err.message}`);
  }

  if (mainWindow) {
    mainWindow.webContents.send('libreoffice:status', { status: 'installing' });
  }

  try {
    let sofficePath;
    if (process.platform === 'win32') {
      sofficePath = await installLibreOfficeWindows(installerPath);
    } else if (process.platform === 'darwin') {
      sofficePath = await installLibreOfficeDarwin(installerPath);
    } else {
      sofficePath = await installLibreOfficeLinux(installerPath);
    }
    // Cleanup installer
    try { fs.unlinkSync(installerPath); } catch {}
    if (mainWindow) {
      mainWindow.webContents.send('libreoffice:status', { status: 'ready' });
    }
    return { sofficePath, installed: true };
  } catch (err) {
    log.error('LIBRE', 'install_failed', { error: err.message });
    if (mainWindow) {
      mainWindow.webContents.send('libreoffice:status', { status: 'error', message: err.message });
    }
    throw new Error(`Gagal install LibreOffice: ${err.message}`);
  }
}

async function convertPdfToDocx(sofficePath, pdfPath, docxPath) {
  log.info('LIBRE', 'converting_pdf_to_docx', { sofficePath, pdfPath, docxPath });
  const outDir = path.dirname(docxPath);
  return new Promise((resolve, reject) => {
    const args = [
      '--headless',
      '--norestore',
      '--infilter="writer_pdf_import"',
      '--convert-to', 'docx',
      '--outdir', outDir,
      pdfPath,
    ];
    const child = spawn(sofficePath, args, { stdio: 'pipe', env: { ...process.env, HOME: LIBRE_OFFICE_DIR } });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('close', (code) => {
      log.info('LIBRE', 'convert_exit', { code, stdout: stdout.slice(0, 500), stderr: stderr.slice(0, 500) });
      // LibreOffice generates output filename from input name
      const baseName = path.basename(pdfPath, '.pdf');
      const expectedOutput = path.join(outDir, baseName + '.docx');
      if (fs.existsSync(expectedOutput)) {
        // Rename to desired path if different
        if (expectedOutput !== docxPath) {
          fs.copyFileSync(expectedOutput, docxPath);
          try { fs.unlinkSync(expectedOutput); } catch {}
        }
        resolve(docxPath);
      } else {
        reject(new Error(`Konversi gagal. Output tidak ditemukan.`));
      }
    });
    child.on('error', reject);
  });
}

// IPC: Check LibreOffice status
ipcMain.handle('libreoffice:check', async () => {
  const detected = await detectLibreOffice();
  return { available: !!detected, path: detected };
});

// IPC: Export DOCX via LibreOffice (PDF → DOCX)
ipcMain.handle('docx:export-via-libreoffice', async (event, { html, filePath }) => {
  const startTime = Date.now();
  log.info('IPC', 'docx:export-via-libreoffice');

  const win = BrowserWindow.fromWebContents(event.sender);

  // 1. Ensure LibreOffice is available (auto-download if needed)
  let sofficePath;
  try {
    const result = await ensureLibreOffice(win);
    sofficePath = result.sofficePath;
    if (result.installed) {
      log.info('IPC', 'libreoffice_auto_installed', { path: sofficePath });
    }
  } catch (err) {
    log.error('IPC', 'libreoffice_unavailable', { error: err.message });
    return { ok: false, error: err.message, fallback: true };
  }

  // 2. Generate temporary PDF from HTML
  const tmpPdf = path.join(app.getPath('temp'), `rps-export-${Date.now()}.pdf`);
  const tmpHtml = path.join(app.getPath('temp'), `rps-export-${Date.now()}.html`);
  let tmpWin;
  try {
    fs.writeFileSync(tmpHtml, html, 'utf-8');
    tmpWin = new BrowserWindow({
      width: 1200, height: 900, show: false,
      webPreferences: { webSecurity: false },
    });
    const fileUrl = 'file://' + tmpHtml.replace(/\\/g, '/');
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('PDF load timeout')), 30000);
      tmpWin.webContents.once('did-finish-load', () => { clearTimeout(timer); resolve(); });
      tmpWin.webContents.once('did-fail-load', (_e, code, desc) => { clearTimeout(timer); reject(new Error(`fail ${code}: ${desc}`)); });
      tmpWin.loadURL(fileUrl);
    });
    await new Promise(r => setTimeout(r, 1000));
    const pdfBuffer = await tmpWin.webContents.printToPDF({ landscape: true, preferCSSPageSize: true });
    fs.writeFileSync(tmpPdf, pdfBuffer);
    log.info('IPC', 'tmp_pdf_created', { bytes: pdfBuffer.byteLength });
  } catch (err) {
    log.error('IPC', 'tmp_pdf_failed', { error: err.message });
    return { ok: false, error: `Gagal generate PDF: ${err.message}`, fallback: true };
  } finally {
    if (tmpWin) tmpWin.destroy();
    try { fs.unlinkSync(tmpHtml); } catch {}
  }

  // 3. Convert PDF → DOCX via LibreOffice
  try {
    await convertPdfToDocx(sofficePath, tmpPdf, filePath);
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    const size = fs.statSync(filePath).size;
    log.info('IPC', 'docx_export_complete', { filePath, duration, bytes: size });
    return { ok: true };
  } catch (err) {
    log.error('IPC', 'docx_convert_failed', { error: err.message });
    return { ok: false, error: err.message, fallback: true };
  } finally {
    try { fs.unlinkSync(tmpPdf); } catch {}
  }
});

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
