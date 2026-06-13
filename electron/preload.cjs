const { contextBridge, ipcRenderer } = require('electron');

// Expose secure API integrations to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  onUpdateMessage: (callback) => ipcRenderer.on('update-message', (event, message) => callback(message)),
  setServerUrl: (url) => ipcRenderer.send('set-server-url', url),
  getServerUrl: () => ipcRenderer.invoke('get-server-url'),
  openGoogleLogin: (clientId) => ipcRenderer.send('open-google-login', clientId),
  onGoogleOauthCode: (callback) => ipcRenderer.on('google-oauth-code', (event, code) => callback(code)),
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  appVersion: ipcRenderer.sendSync('get-app-version'),
  setLaunchOnStartup: (enable) => ipcRenderer.send('set-launch-on-startup', enable),
  getLaunchOnStartup: () => ipcRenderer.invoke('get-launch-on-startup'),
  setMinimizeToTray: (enable) => ipcRenderer.send('set-minimize-to-tray', enable),
  getMinimizeToTray: () => ipcRenderer.invoke('get-minimize-to-tray'),
  setBadgeCount: (count) => ipcRenderer.send('set-badge-count', count)
});
