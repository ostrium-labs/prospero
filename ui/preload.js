'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('prospero', {
  getState: () => ipcRenderer.invoke('app:state'),
  addFolder: () => ipcRenderer.invoke('library:add'),
  removeFolder: (folder) => ipcRenderer.invoke('library:remove', folder),
  rescan: () => ipcRenderer.invoke('library:rescan'),
  reveal: (id) => ipcRenderer.invoke('game:reveal', id),
  launch: (id) => ipcRenderer.invoke('game:launch', id),
  stop: () => ipcRenderer.invoke('game:stop'),
  saveSettings: (patch) => ipcRenderer.invoke('settings:save', patch),
  pickEmulator: () => ipcRenderer.invoke('settings:pick-emulator'),
  openLogs: () => ipcRenderer.invoke('app:open-logs'),
  minimize: () => ipcRenderer.send('window:minimize'),
  close: () => ipcRenderer.send('window:close'),
  toggleFullscreen: () => ipcRenderer.send('window:fullscreen'),
  onState: (callback) => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on('state:changed', listener);
    return () => ipcRenderer.removeListener('state:changed', listener);
  },
  onLog: (callback) => {
    const listener = (_event, line) => callback(line);
    ipcRenderer.on('emulator:log', listener);
    return () => ipcRenderer.removeListener('emulator:log', listener);
  },
  onStatus: (callback) => {
    const listener = (_event, status) => callback(status);
    ipcRenderer.on('emulator:status', listener);
    return () => ipcRenderer.removeListener('emulator:status', listener);
  },
  onExit: (callback) => {
    const listener = (_event, info) => callback(info);
    ipcRenderer.on('emulator:exit', listener);
    return () => ipcRenderer.removeListener('emulator:exit', listener);
  },
});
