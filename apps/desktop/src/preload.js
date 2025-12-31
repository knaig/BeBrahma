const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Navigation
  onNavigate: (callback) => ipcRenderer.on('navigate', (_, url) => callback(url)),

  // Session summary
  onShowSessionSummary: (callback) => ipcRenderer.on('show-session-summary', () => callback()),

  // Search focus
  onFocusSearch: (callback) => ipcRenderer.on('focus-search', () => callback()),

  // App info
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),

  // Platform detection
  platform: process.platform,
  isElectron: true,
});

// Log that preload has loaded
console.log('Founder OS Desktop - Preload script loaded');
