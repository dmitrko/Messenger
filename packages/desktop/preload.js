const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,
  on: (channel, func) => ipcRenderer.on(channel, (e, ...args) => func(...args)),
  send: (channel, ...args) => ipcRenderer.send(channel, ...args),
});
