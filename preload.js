const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  applyMods: (mods) => ipcRenderer.send('apply-mods', mods),
  changeTitle: (title) => ipcRenderer.send('change-title', title),
  sendPlaybackState: (state) => ipcRenderer.send('spotify:playback', state),
  openDevTools: () => ipcRenderer.send('open-devtools')
});

contextBridge.exposeInMainWorld('spotify', {
  play: () => ipcRenderer.invoke('spotify-play'),
  pause: () => ipcRenderer.invoke('spotify-pause'),
  next: () => ipcRenderer.invoke('spotify-next'),
  previous: () => ipcRenderer.invoke('spotify-previous'),
  onPlayback: (callback) => ipcRenderer.on('spotify:playback', (event, data) => callback(data)),
});