/* PAV (Play Any Video) - Secure Electron Preload Script */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  minimize: () => ipcRenderer.invoke('window-minimize'),
  maximize: () => ipcRenderer.invoke('window-maximize'),
  close: () => ipcRenderer.invoke('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  openFileDialog: () => ipcRenderer.invoke('dialog-open-file'),
  openFolderDialog: () => ipcRenderer.invoke('dialog-open-folder'),
  onOpenFile: (callback) => {
    ipcRenderer.on('open-file-path', (event, filePath) => callback(filePath));
  },
  onWindowStateChange: (callback) => {
    ipcRenderer.on('window-state-change', (event, isMaximized) => callback(isMaximized));
  }
});
