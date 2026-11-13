'use strict';

console.log('[renderer] loaded');

const api = window.prospero;

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

const CONTROLS = [
  ['Cross', 'Cross'],
  ['Circle', 'Circle'],
  ['Square', 'Square'],
  ['Triangle', 'Triangle'],
  ['Up', 'D-pad up'],
  ['Down', 'D-pad down'],
  ['Left', 'D-pad left'],
  ['Right', 'D-pad right'],
  ['L1', 'L1'],
  ['R1', 'R1'],
  ['L2', 'L2'],
  ['R2', 'R2'],
  ['L3', 'L3 (left stick click)'],
  ['R3', 'R3 (right stick click)'],
  ['Options', 'Options'],
  ['TouchPad', 'Touch pad left'],
  ['TouchPadRight', 'Touch pad right'],
  ['LeftStickUp', 'Left stick up'],
  ['LeftStickDown', 'Left stick down'],
  ['LeftStickLeft', 'Left stick left'],
  ['LeftStickRight', 'Left stick right'],
  ['RightStickUp', 'Right stick up'],
  ['RightStickDown', 'Right stick down'],
  ['RightStickLeft', 'Right stick left'],
  ['RightStickRight', 'Right stick right'],
  ['SpeakerVolume', 'Speaker volume cycle'],
  ['VibrationIntensity', 'Vibration cycle'],
  ['TriggerEffectIntensity', 'Trigger intensity cycle'],
  ['TouchPadMode', 'Touch-pad mode toggle'],
];

const RESERVED = new Set(['Escape', 'F1', 'F2', 'F7', 'F8', 'F11']);
const LABELS = new Map(CONTROLS);

let state = {
  folders: [],
  games: [],
  settings: { keymap: { ...DEFAULT_KEYMAP } },
  scanning: false,
  running: null,
};
let selected = 0;
let view = 'home';
let draftKeymap = { ...DEFAULT_KEYMAP };
let captureControl = null;
let exited = false;
let runningVisible = false;
let runningTitle = '';
let toastTimer = null;

const $ = (id) => document.getElementById(id);

function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  Object.assign(node, props);
  for (const child of children) {
    node.append(child);
  }
  return node;
}

function initials(title) {
  return String(title || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}

function gradientFor(text) {
  let hue = 0;
  for (const char of String(text)) hue = (hue * 31 + char.charCodeAt(0)) % 360;
  return `linear-gradient(135deg, hsl(${hue} 58% 24%), hsl(${(hue + 48) % 360} 62% 10%))`;
}

function selectedGame() {
  return state.games[selected] || null;
}

function toast(message) {
  const node = $('toast');
  node.textContent = message;
  node.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove('show'), 2800);
}

function updateClock() {
  $('clock').textContent = new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function setView(name) {
  view = name;
  document.querySelectorAll('.view').forEach((section) => {
    section.classList.toggle('active', section.id === `view-${name}`);
  });
  document.querySelectorAll('.nav-item').forEach((button) => {
    button.classList.toggle('active', button.dataset.view === name);
  });
  if (name === 'settings') renderSettings();
  if (name === 'library') renderLibrary();
}

function render() {
  selected = Math.max(0, Math.min(selected, state.games.length - 1));
  renderHero();
  renderCarousel();
  renderLibrary();
  renderSettings();
  renderKeymap();
  renderRunning();
}

function renderHero() {
  const game = selectedGame();
  const play = $('btn-play');
  const reveal = $('btn-reveal');
  const background = $('hero-bg');

  const hero = $('hero');
  if (!game) {
    hero.classList.add('empty-hero');
    $('hero-title').textContent = 'No games yet';
    $('hero-titleid').textContent = '';
    $('hero-meta').textContent = 'Add a folder to build your library.';
    $('hero-counter').textContent = '';
    background.style.backgroundImage = '';
    background.style.opacity = '0.35';
    play.disabled = true;
    reveal.disabled = true;
    return;
  }

  hero.classList.remove('empty-hero');
  $('hero-title').textContent = game.title;
  $('hero-titleid').textContent = game.titleId || game.kind.toUpperCase();
  const kind = game.kind === 'dir' ? 'Game folder' : game.kind.toUpperCase();
  $('hero-meta').textContent = `${kind} · ${game.path}`;
  $('hero-counter').textContent = `${selected + 1} / ${state.games.length}`;
  play.disabled = false;
  reveal.disabled = false;

  if (game.background) {
    background.style.backgroundImage = `url("${game.background}")`;
    background.style.opacity = '0.55';
  } else {
    background.style.backgroundImage = gradientFor(game.title);
    background.style.opacity = '1';
  }
}

function renderCarousel() {
  const carousel = $('carousel');
  carousel.replaceChildren();

  state.games.forEach((game, index) => {
    const tile = el('button', {
      className: `tile${index === selected ? ' selected' : ''}`,
      title: game.title,
      type: 'button',
    });

    if (game.icon) {
      const image = el('img', { src: game.icon, alt: '' });
      image.addEventListener('error', () => { console.warn('[art] failed', game.icon); image.remove(); });
      tile.append(image);
    }
    if (!game.icon) {
      tile.append(el('div', { className: 'tile-fallback', textContent: initials(game.title) }));
    }
    tile.append(el('span', { className: 'tile-label', textContent: game.title }));
    tile.addEventListener('click', () => selectGame(index));
    tile.addEventListener('dblclick', () => launchSelected());
    carousel.append(tile);
  });

  $('empty-state').classList.toggle('show', state.games.length === 0);
  $('carousel').style.display = state.games.length === 0 ? 'none' : 'flex';

  const active = carousel.querySelector('.tile.selected');
  if (active) {
    const left = active.offsetLeft - carousel.clientWidth / 2 + active.clientWidth / 2;
    carousel.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
  }
}

function selectGame(index) {
  selected = Math.max(0, Math.min(index, state.games.length - 1));
  renderHero();
  renderCarousel();
}

function renderLibrary() {
  const folders = $('folders');
  folders.replaceChildren();
  if (state.folders.length === 0) {
    folders.append(
      el('p', {
        className: 'muted',
        textContent: 'No folders yet. Add one to start scanning.',
      }),
    );
  }
  for (const folder of state.folders) {
    const remove = el('button', { className: 'icon-btn', textContent: 'Remove', type: 'button' });
    remove.addEventListener('click', async () => {
      state = await api.removeFolder(folder);
      render();
      toast('Folder removed');
    });
    folders.append(
      el('div', { className: 'folder' }, [
        el('span', { className: 'folder-path', textContent: folder }),
        remove,
      ]),
    );
  }

  const grid = $('library-games');
  grid.replaceChildren();
  $('game-count').textContent = `(${state.games.length})`;
  if (state.games.length === 0) {
    grid.append(el('p', { className: 'muted', textContent: 'No games found yet.' }));
    return;
  }

  state.games.forEach((game, index) => {
    const art = game.icon
      ? el('img', { src: game.icon, alt: '' })
      : el('div', { className: 'fallback', textContent: initials(game.title) });
    if (art.tagName === 'IMG') art.addEventListener('error', () => { console.warn('[art] failed', game.icon); art.remove(); });

    const card = el('div', { className: 'game-card', title: game.path }, [
      art,
      el('div', { className: 'info' }, [
        el('div', { className: 'name', textContent: game.title }),
        el('div', {
          className: 'sub',
          textContent: game.titleId || game.kind.toUpperCase(),
        }),
      ]),
    ]);
    card.addEventListener('click', () => {
      selectGame(index);
      setView('home');
    });
    card.addEventListener('dblclick', () => {
      selectGame(index);
      launchSelected();
    });
    grid.append(card);
  });
}

function renderSettings() {
  const settings = state.settings || {};
  const pathInput = $('emulator-path');
  const argsInput = $('extra-args');
  if (document.activeElement !== pathInput) pathInput.value = settings.emulatorPath || '';
  if (document.activeElement !== argsInput) argsInput.value = settings.extraArgs || '';
  $('keyboard-player').value = String(settings.keyboardPlayer ?? 0);
  $('graphics-debug').checked = Boolean(settings.graphicsDebugDump);
}

function renderKeymap() {
  const keymap = $('keymap');
  keymap.replaceChildren();
  for (const [control, label] of CONTROLS) {
    const binding = draftKeymap[control];
    const button = el('button', {
      className: `binding${binding ? '' : ' empty'}`,
      type: 'button',
      textContent: binding || 'Unbound',
      title: 'Click to rebind',
    });
    button.addEventListener('click', () => startCapture(control));
    keymap.append(
      el('div', { className: 'key-row' }, [
        el('span', { className: 'label', textContent: label }),
        button,
      ]),
    );
  }
}

function renderRunning() {
  const overlay = $('running');
  if (state.running) {
    overlay.classList.remove('hidden');
    $('running-title').textContent = state.running.title || 'Running';
    if (!exited) {
      $('running-status').textContent = state.running.status || 'Starting…';
    }
    $('btn-stop').textContent = exited ? 'Close' : 'Stop';
    return;
  }
  if (runningVisible) {
    overlay.classList.remove('hidden');
    $('running-title').textContent = runningTitle || 'Game';
    $('btn-stop').textContent = 'Close';
    return;
  }
  overlay.classList.add('hidden');
}

function startCapture(control) {
  captureControl = control;
  $('capture-title').textContent = `Set binding — ${LABELS.get(control) || control}`;
  $('capture-key').textContent = '?';
  $('capture').classList.remove('hidden');
}

function finishCapture(binding) {
  if (captureControl && binding) {
    draftKeymap[captureControl] = binding;
    toast(`${LABELS.get(captureControl) || captureControl} → ${binding}`);
  }
  captureControl = null;
  $('capture').classList.add('hidden');
  renderKeymap();
}

function keyNameFromEvent(event) {
  if (event.code && /^Key[A-Z]$/.test(event.code)) return event.code.slice(3);
  if (event.code && /^Digit[0-9]$/.test(event.code)) return event.code.slice(5);

  const named = {
    Enter: 'Return',
    Backspace: 'Backspace',
    Tab: 'Tab',
    ' ': 'Space',
    ArrowUp: 'Up',
    ArrowDown: 'Down',
    ArrowLeft: 'Left',
    ArrowRight: 'Right',
    Shift: 'Left Shift',
    Control: 'Left Ctrl',
    Alt: 'Left Alt',
    Meta: 'Left GUI',
    Insert: 'Insert',
    Delete: 'Delete',
    Home: 'Home',
    End: 'End',
    PageUp: 'PageUp',
    PageDown: 'PageDown',
    CapsLock: 'CapsLock',
    NumLock: 'Numlock',
    ScrollLock: 'ScrollLock',
    Pause: 'Pause',
    PrintScreen: 'PrintScreen',
  };
  if (named[event.key]) return named[event.key];
  if (/^F([1-9]|1[0-9]|2[0-4])$/.test(event.key)) return event.key;
  return null;
}

function mouseBinding(button) {
  switch (button) {
    case 0:
      return 'Mouse:Left';
    case 1:
      return 'Mouse:Middle';
    case 2:
      return 'Mouse:Right';
    case 3:
      return 'Mouse:X1';
    case 4:
      return 'Mouse:X2';
    default:
      return null;
  }
}

async function launchSelected() {
  const game = selectedGame();
  if (!game) return;
  try {
    state = await api.launch(game.id);
    exited = false;
    runningVisible = true;
    runningTitle = game.title;
    $('running-log').textContent = '';
    $('running-title').textContent = game.title;
    $('running-status').textContent = 'Starting…';
    $('btn-stop').textContent = 'Stop';
    renderRunning();
  } catch (error) {
    toast(String(error.message || error).replace(/^Error invoking remote method '[^']+': /, ''));
  }
}

function appendLog(line) {
  const log = $('running-log');
  log.textContent += `${line}\n`;
  const lines = log.textContent.split('\n');
  if (lines.length > 500) log.textContent = lines.slice(-500).join('\n');
  log.scrollTop = log.scrollHeight;
}

function bindEvents() {
  document.querySelectorAll('.nav-item').forEach((button) => {
    button.addEventListener('click', () => setView(button.dataset.view));
  });

  $('btn-add').addEventListener('click', addFolder);
  $('btn-add-empty').addEventListener('click', addFolder);
  $('btn-add-folder').addEventListener('click', addFolder);
  $('btn-play').addEventListener('click', launchSelected);
  $('btn-reveal').addEventListener('click', () => {
    const game = selectedGame();
    if (game) api.reveal(game.id);
  });

  $('btn-rescan').addEventListener('click', async () => {
    state = await api.rescan();
    render();
    toast('Library rescanned');
  });

  $('btn-pick-emu').addEventListener('click', async () => {
    state = await api.pickEmulator();
    renderSettings();
  });

  $('btn-save-settings').addEventListener('click', async () => {
    state = await api.saveSettings({
      emulatorPath: $('emulator-path').value.trim(),
      extraArgs: $('extra-args').value.trim(),
      keyboardPlayer: Number($('keyboard-player').value),
      graphicsDebugDump: $('graphics-debug').checked,
    });
    renderSettings();
    toast('Settings saved');
  });

  $('btn-save-keys').addEventListener('click', async () => {
    state = await api.saveSettings({ keymap: { ...draftKeymap } });
    draftKeymap = { ...state.settings.keymap };
    renderKeymap();
    toast('Keybindings saved');
  });

  $('btn-reset-keys').addEventListener('click', () => {
    draftKeymap = { ...DEFAULT_KEYMAP };
    renderKeymap();
    toast('Bindings reset — save to apply');
  });

  $('btn-stop').addEventListener('click', async () => {
    if (exited) {
      runningVisible = false;
      exited = false;
      $('running').classList.add('hidden');
      return;
    }
    await api.stop();
  });

  $('btn-open-log').addEventListener('click', () => api.openLogs());

  $('btn-min').addEventListener('click', () => api.minimize());
  $('btn-close').addEventListener('click', () => api.close());

  $('capture').addEventListener('mousedown', (event) => {
    if (!captureControl) return;
    if (event.target.id === 'capture') {
      finishCapture(null);
      return;
    }
    const binding = mouseBinding(event.button);
    if (binding) {
      event.preventDefault();
      finishCapture(binding);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (captureControl) {
      event.preventDefault();
      event.stopPropagation();
      if (event.key === 'Escape') {
        finishCapture(null);
        return;
      }
      const name = keyNameFromEvent(event);
      if (!name) {
        $('capture-key').textContent = '?';
        return;
      }
      if (RESERVED.has(name)) {
        $('capture-key').textContent = 'Reserved';
        return;
      }
      finishCapture(name);
      return;
    }

    if (event.key === 'F11') {
      event.preventDefault();
      api.toggleFullscreen();
      return;
    }

    if (state.running) return;

    if (view !== 'home') {
      if (event.key === 'Escape') setView('home');
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      selectGame(selected - 1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      selectGame(selected + 1);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      launchSelected();
    } else if (event.key.toLowerCase() === 'a') {
      addFolder();
    } else if (event.key.toLowerCase() === 'r') {
      const game = selectedGame();
      if (game) api.reveal(game.id);
    }
  });

  api.onState((next) => {
    state = next;
    selected = Math.max(0, Math.min(selected, state.games.length - 1));
    render();
  });

  api.onLog(appendLog);

  api.onStatus((status) => {
    if (status && !exited) $('running-status').textContent = status;
  });

  api.onExit((info) => {
    exited = true;
    runningVisible = true;
    runningTitle = $('running-title').textContent || runningTitle;
    const detail = info?.error
      ? info.error
      : info?.signal
        ? `signal ${info.signal}`
        : info?.code != null
          ? `code ${info.code}`
          : 'closed';
    $('running-status').textContent = `Exited (${detail})`;
    $('btn-stop').textContent = 'Close';
    toast('Game exited');
    state.running = null;
    $('running').classList.remove('hidden');
  });
}

async function addFolder() {
  state = await api.addFolder();
  selected = 0;
  render();
  if (state.games.length > 0) toast(`Found ${state.games.length} game(s)`);
}

async function init() {
  state = await api.getState();
  draftKeymap = { ...(state.settings.keymap || DEFAULT_KEYMAP) };
  bindEvents();
  setView('home');
  render();
  updateClock();
  setInterval(updateClock, 30000);
}

init().catch((error) => {
  console.error(error);
  toast(String(error.message || error));
});
