/* PAV (Play Any Video) - Secure Electron Preload Script */

const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  minimize: () => ipcRenderer.invoke('window-minimize'),
  maximize: () => ipcRenderer.invoke('window-maximize'),
  close: () => ipcRenderer.invoke('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  openFileDialog: () => ipcRenderer.invoke('dialog-open-file'),
  openFolderDialog: () => ipcRenderer.invoke('dialog-open-folder'),
  getInitialFile: () => ipcRenderer.invoke('get-initial-file'),
  readFileText: (filePath) => ipcRenderer.invoke('read-file-text', filePath),
  getPathForFile: (file) => {
    try {
      if (webUtils && typeof webUtils.getPathForFile === 'function') {
        return webUtils.getPathForFile(file);
      }
    } catch (e) {
      console.warn('getPathForFile failed:', e);
    }
    return file.path || '';
  },
  onOpenFile: (callback) => {
    ipcRenderer.on('open-file-path', (event, filePath) => callback(filePath));
  },
  onWindowStateChange: (callback) => {
    ipcRenderer.on('window-state-change', (event, isMaximized) => callback(isMaximized));
  }
});
