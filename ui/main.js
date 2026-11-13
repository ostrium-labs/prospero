'use strict';

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { pathToFileURL } = require('url');

if (process.platform === 'linux' && process.env.PROSPERO_OZONE) {
  app.commandLine.appendSwitch('ozone-platform', process.env.PROSPERO_OZONE);
}

const USER_DIR = app.getPath('userData');
const SETTINGS_FILE = path.join(USER_DIR, 'settings.json');
const LIBRARY_FILE = path.join(USER_DIR, 'library.json');

const DEFAULT_KEYMAP = {
  Cross: 'J',
  Circle: 'L',
  Square: 'K',
  Triangle: 'I',
  Up: 'Up',
  Down: 'Down',
  Left: 'Left',
  Right: 'Right',
  L1: 'Q',
  R1: 'E',
  L2: 'Z',
  R2: 'C',
  L3: 'Left Shift',
  R3: 'Left Ctrl',
  Options: 'Return',
  TouchPad: 'Backspace',
  TouchPadRight: 'Tab',
  LeftStickUp: 'W',
  LeftStickDown: 'S',
  LeftStickLeft: 'A',
  LeftStickRight: 'D',
  RightStickUp: 'T',
  RightStickDown: 'G',
  RightStickLeft: 'F',
  RightStickRight: 'H',
  SpeakerVolume: '1',
  VibrationIntensity: '2',
  TriggerEffectIntensity: '3',
  TouchPadMode: 'F6',
};

const DEFAULT_SETTINGS = {
  emulatorPath: guessEmulatorPath(),
  extraArgs: '',
  keyboardPlayer: 0,
  graphicsDebugDump: false,
  keymap: { ...DEFAULT_KEYMAP },
};

const SKIP_DIRS = new Set([
  'node_modules', '.git', '_Build', '_Shaders', '_SaveData', '_PipelineCache',
  'System Volume Information', '$RECYCLE.BIN', 'lost+found',
]);

const MAX_SCAN_DEPTH = 5;
const MAX_SCAN_ENTRIES = 50000;

let win = null;
let folders = [];
let games = [];
let settings = { ...DEFAULT_SETTINGS };
let running = null;
let scanning = false;

function guessEmulatorPath() {
  const candidates = [
    process.env.PROSPERO_EMULATOR,
    path.join(os.homedir(), 'Documents/Ostriumlabs/prospero-emu/_Build/linux-no-qt/kyty_emulator'),
    path.join(os.homedir(), 'Documents/Ostriumlabs/prospero-emu/_Build/linux-no-qt/kyty_emulator.exe'),
    path.join(os.homedir(), 'Documents/Ostriumlabs/prospero-emu/_Build/windows/kyty_emulator.exe'),
    path.join(process.cwd(), '_Build/linux-no-qt/kyty_emulator'),
    'kyty_emulator',
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      if (candidate === 'kyty_emulator' || fs.existsSync(candidate)) return candidate;
    } catch {}
  }
  return 'kyty_emulator';
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2));
  fs.renameSync(tmp, file);
}

function loadState() {
  const savedSettings = readJson(SETTINGS_FILE, {});
  settings = {
    ...DEFAULT_SETTINGS,
    ...savedSettings,
    keymap: { ...DEFAULT_KEYMAP, ...(savedSettings.keymap || {}) },
  };
  const library = readJson(LIBRARY_FILE, {});
  folders = Array.isArray(library.folders) ? library.folders : [];
}

function saveLibrary() {
  writeJson(LIBRARY_FILE, { folders });
}

function saveSettings() {
  writeJson(SETTINGS_FILE, settings);
}

function publicState() {
  return {
    folders,
    games,
    settings,
    scanning,
    running: running
      ? {
          gameId: running.gameId,
          title: running.title,
          status: running.status,
          startedAt: running.startedAt,
        }
      : null,
  };
}

function send(channel, payload) {
  if (win && !win.isDestroyed()) {
    win.webContents.send(channel, payload);
  }
}

function broadcast() {
  send('state:changed', publicState());
}

function fileUrl(file) {
  try {
    if (fs.existsSync(file)) return pathToFileURL(file).href;
  } catch {}
  return null;
}

async function readParam(dir) {
  try {
    const text = await fsp.readFile(path.join(dir, 'sce_sys', 'param.json'), 'utf8');
    const json = JSON.parse(text);
    const localized = json.localizedParameters || {};
    const language = localized.defaultLanguage || 'en-US';
    const titleName =
      localized[language]?.titleName ||
      Object.values(localized).find((value) => value && value.titleName)?.titleName ||
      '';
    return { titleName, titleId: json.titleId || '' };
  } catch {
    return { titleName: '', titleId: '' };
  }
}

function gameId(gamePath) {
  return crypto.createHash('sha1').update(gamePath).digest('hex').slice(0, 16);
}

async function describeGame(gamePath, kind) {
  const isDir = kind === 'dir';
  const dir = isDir ? gamePath : path.dirname(gamePath);
  const param = isDir ? await readParam(dir) : { titleName: '', titleId: '' };
  const fallback = isDir
    ? path.basename(dir)
    : path.basename(gamePath).replace(/\.(elf|zar)$/i, '');
  const title = param.titleName || fallback;
  const icon = isDir ? fileUrl(path.join(dir, 'sce_sys', 'icon0.png')) : null;
  const background = isDir ? fileUrl(path.join(dir, 'sce_sys', 'pic0.png')) : null;
  return {
    id: gameId(gamePath),
    path: gamePath,
    kind,
    title,
    titleId: param.titleId || '',
    icon,
    background,
    size: isDir ? null : await fileSize(gamePath),
  };
}

async function fileSize(file) {
  try {
    return (await fsp.stat(file)).size;
  } catch {
    return null;
  }
}

async function scanFolder(root, depth, budget) {
  const found = [];
  if (depth > MAX_SCAN_DEPTH || budget.entries <= 0) return found;

  let entries;
  try {
    entries = await fsp.readdir(root, { withFileTypes: true });
  } catch {
    return found;
  }

  const hasEboot = entries.some(
    (entry) => entry.isFile() && entry.name.toLowerCase() === 'eboot.bin',
  );
  if (hasEboot) {
    budget.entries -= entries.length;
    found.push(await describeGame(root, 'dir'));
    return found;
  }

  for (const entry of entries) {
    if (budget.entries <= 0) break;
    if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) {
      budget.entries -= 1;
      found.push(...(await scanFolder(full, depth + 1, budget)));
    } else if (entry.isFile()) {
      const lower = entry.name.toLowerCase();
      if (lower.endsWith('.elf') || lower.endsWith('.zar')) {
        budget.entries -= 1;
        found.push(await describeGame(full, lower.endsWith('.zar') ? 'zar' : 'elf'));
      }
    }
  }
  return found;
}

async function scanAll() {
  scanning = true;
  broadcast();
  const budget = { entries: MAX_SCAN_ENTRIES };
  const all = [];
  for (const folder of folders) {
    all.push(...(await scanFolder(folder, 0, budget)));
  }
  const byPath = new Map();
  for (const game of all) byPath.set(game.path, game);
  games = [...byPath.values()].sort((a, b) => a.title.localeCompare(b.title));
  console.log(`[scan] ${folders.length} folder(s), ${games.length} game(s)`);
  for (const game of games) console.log(`[scan] ${game.title} -> ${game.path}`);
  scanning = false;
  broadcast();
}

function splitArgs(text) {
  const out = [];
  let current = '';
  let quote = null;
  for (const ch of String(text || '')) {
    if (quote) {
      if (ch === quote) quote = null;
      else current += ch;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (/\s/.test(ch)) {
      if (current) {
        out.push(current);
        current = '';
      }
    } else {
      current += ch;
    }
  }
  if (current) out.push(current);
  return out;
}

function emulatorArgs(game) {
  const args = ['--game', game.path];
  if (Number(settings.keyboardPlayer) > 0) {
    args.push('--keyboard-player', String(settings.keyboardPlayer));
  }
  if (settings.graphicsDebugDump) args.push('--graphics-debug-dump');
  for (const [control, binding] of Object.entries(settings.keymap || {})) {
    if (binding) args.push('--keymap', `${control}=${binding}`);
  }
  args.push(...splitArgs(settings.extraArgs));
  return args;
}

function launchGame(id) {
  const game = games.find((item) => item.id === id);
  if (!game) throw new Error('Game not found');
  if (running) throw new Error('A game is already running');

  const runDir = path.join(USER_DIR, 'runs', game.id);
  const logDir = path.join(USER_DIR, 'logs');
  fs.mkdirSync(runDir, { recursive: true });
  fs.mkdirSync(logDir, { recursive: true });
  const logPath = path.join(logDir, `${game.id}-${Date.now()}.log`);
  const logStream = fs.createWriteStream(logPath, { flags: 'a' });
  logStream.on('error', (error) => console.error('[log]', error.message));

  const args = emulatorArgs(game);
  const child = spawn(settings.emulatorPath, args, {
    cwd: runDir,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env },
  });

  running = {
    gameId: game.id,
    title: game.title,
    status: 'Starting…',
    startedAt: Date.now(),
    child,
    logPath,
  };
  broadcast();

  const forward = (buffer) => {
    const text = buffer.toString();
    logStream.write(text);
    for (const line of text.split(/\r?\n/)) {
      if (line.trim()) {
        if (running) running.status = line.slice(0, 160);
        send('emulator:log', line);
      }
    }
    if (running) send('emulator:status', running.status);
  };

  child.stdout.on('data', forward);
  child.stderr.on('data', forward);

  let finished = false;
  const finish = (info) => {
    if (finished) return;
    finished = true;
    if (!logStream.writableEnded) logStream.end();
    running = null;
    broadcast();
    send('emulator:exit', info);
  };

  child.on('error', (error) => {
    logStream.write(`\n[launcher] ${error.message}\n`);
    finish({ error: error.message });
  });

  child.on('exit', (code, signal) => {
    logStream.write(`\n[launcher] exited code=${code} signal=${signal}\n`);
    finish({ code, signal });
  });

  return publicState();
}

function stopGame() {
  if (!running || !running.child) return publicState();
  running.status = 'Stopping…';
  broadcast();
  const child = running.child;
  child.kill('SIGTERM');
  setTimeout(() => {
    if (child.exitCode === null && child.signalCode === null) {
      try { child.kill('SIGKILL'); } catch {}
    }
  }, 5000);
  return publicState();
}

function createWindow() {
  win = new BrowserWindow({
    width: 1600,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    frame: false,
    backgroundColor: '#05070d',
    show: false,
    title: 'Prospero',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.webContents.on('console-message', (_event, ...args) => {
    console.log('[renderer]', ...args);
  });
  win.webContents.on('did-fail-load', (_event, code, description, url) => {
    console.error('[renderer] failed to load', code, description, url);
  });
  win.once('ready-to-show', () => win.show());
  const view = process.env.PROSPERO_VIEW;
  if (view && ['home', 'library', 'settings'].includes(view)) {
    win.webContents.once('did-finish-load', () => {
      setTimeout(() => {
        win.webContents.executeJavaScript(
          `document.querySelector('[data-view="${view}"]')?.click()`,
        );
      }, 400);
    });
  }
  if (process.env.PROSPERO_SCREENSHOT) {
    win.webContents.once('did-finish-load', () => {
      setTimeout(async () => {
        try {
          const image = await win.webContents.capturePage();
          fs.writeFileSync(process.env.PROSPERO_SCREENSHOT, image.toPNG());
          console.log('[screenshot]', process.env.PROSPERO_SCREENSHOT);
        } catch (error) {
          console.error('[screenshot]', error.message);
        }
        app.quit();
      }, Number(process.env.PROSPERO_SCREENSHOT_DELAY || 1800));
    });
  }
  win.on('closed', () => {
    win = null;
  });
}

ipcMain.handle('app:state', () => publicState());

ipcMain.handle('library:add', async () => {
  const result = await dialog.showOpenDialog(win, {
    title: 'Add a folder containing PS5 games',
    properties: ['openDirectory', 'multiSelections'],
  });
  if (!result.canceled) {
    for (const folder of result.filePaths) {
      if (!folders.includes(folder)) folders.push(folder);
    }
    saveLibrary();
    await scanAll();
  }
  return publicState();
});

ipcMain.handle('library:remove', async (_event, folder) => {
  folders = folders.filter((item) => item !== folder);
  saveLibrary();
  await scanAll();
  return publicState();
});

ipcMain.handle('library:rescan', async () => {
  await scanAll();
  return publicState();
});

ipcMain.handle('game:reveal', (_event, id) => {
  const game = games.find((item) => item.id === id);
  if (game) shell.showItemInFolder(game.path);
  return true;
});

ipcMain.handle('game:launch', (_event, id) => launchGame(id));
ipcMain.handle('game:stop', () => stopGame());

ipcMain.handle('settings:save', (_event, patch) => {
  const next = { ...patch };
  if (next.keymap && typeof next.keymap === 'object') {
    const keymap = { ...DEFAULT_KEYMAP };
    for (const [key, value] of Object.entries(next.keymap)) {
      if (typeof value === 'string') keymap[key] = value;
    }
    next.keymap = keymap;
  }
  settings = { ...settings, ...next };
  saveSettings();
  broadcast();
  return publicState();
});

ipcMain.handle('settings:pick-emulator', async () => {
  const result = await dialog.showOpenDialog(win, {
    title: 'Select the kyty_emulator binary',
    properties: ['openFile'],
  });
  if (!result.canceled && result.filePaths[0]) {
    settings.emulatorPath = result.filePaths[0];
    saveSettings();
    broadcast();
  }
  return publicState();
});

ipcMain.handle('app:open-logs', () => shell.openPath(path.join(USER_DIR, 'logs')));

ipcMain.on('window:minimize', () => win?.minimize());
ipcMain.on('window:close', () => win?.close());
ipcMain.on('window:fullscreen', () => {
  if (win) win.setFullScreen(!win.isFullScreen());
});

app.whenReady().then(async () => {
  console.log('[prospero] userData:', USER_DIR);
  loadState();
  createWindow();
  await scanAll();
  if (process.env.PROSPERO_AUTOLAUNCH && games.length > 0) {
    try {
      console.log('[autolaunch]', games[0].title);
      launchGame(games[0].id);
    } catch (error) {
      console.error('[autolaunch]', error.message);
    }
  }
});

app.on('before-quit', () => {
  if (running?.child) {
    try {
      running.child.kill('SIGTERM');
    } catch {}
  }
});

process.on('exit', () => {
  if (running?.child && running.child.exitCode === null && running.child.signalCode === null) {
    try { running.child.kill('SIGKILL'); } catch {}
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
