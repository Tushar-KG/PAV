/* PAV (Play Any Video) - Electron Main Desktop Process
 * Powers the native desktop application with hardware accelerated video playback,
 * native OS file dialogs, custom window dragging, and command-line file associations.
 */

const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

// Enable GPU hardware acceleration flags for smooth video decoding
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('ignore-gpu-blocklist');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 760,
    minWidth: 640,
    minHeight: 480,
    backgroundColor: '#0B0D12',
    frame: false, // Sleek frameless custom titlebar
    title: 'PAV — Play Any Video',
    icon: path.join(__dirname, 'icon.ico'),
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false // Enables loading local video/audio files directly from disk without CORS blocks
    }
  });

  mainWindow.loadFile('index.html');

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[RENDERER L${level}] ${message} (${sourceId}:${line})`);
  });

  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();

    // Check if a file was passed as argument on command line (e.g. Right click > Open with PAV)
    const filePath = getFileFromArgs(process.argv);
    if (filePath) {
      mainWindow.webContents.send('open-file-path', filePath);
    }
  });

  // Handle window maximize/restore events to sync UI state
  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window-state-change', true);
  });

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window-state-change', false);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function getFileFromArgs(argv) {
  const fileArg = argv.slice(app.isPackaged ? 1 : 2).find(arg => {
    return !arg.startsWith('--') && fs.existsSync(arg);
  });
  return fileArg || null;
}

// Single Instance Lock: If another instance is opened with a file, focus this window and play it
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();

      const filePath = getFileFromArgs(commandLine);
      if (filePath) {
        mainWindow.webContents.send('open-file-path', filePath);
      }
    }
  });

  app.whenReady().then(() => {
    // Remove default top menu bar in favor of our custom modern in-app menu
    Menu.setApplicationMenu(null);
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

// --- IPC Communication Handlers ---
// Window Management
ipcMain.handle('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
    return mainWindow.isMaximized();
  }
  return false;
});

ipcMain.handle('window-close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('window-is-maximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

// Initial file passed via command line argument
ipcMain.handle('get-initial-file', () => {
  return getFileFromArgs(process.argv);
});

// Read text / subtitle file from disk securely
ipcMain.handle('read-file-text', async (event, filePath) => {
  try {
    return await fs.promises.readFile(filePath, 'utf-8');
  } catch (err) {
    console.error('Failed to read file:', err);
    return null;
  }
});

// Native OS Open File Dialog
ipcMain.handle('dialog-open-file', async () => {
  if (!mainWindow) return [];
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Media or Subtitle Files',
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'All Supported Media', extensions: ['mp4', 'mkv', 'webm', 'avi', 'mov', 'flv', 'wmv', 'mp3', 'flac', 'wav', 'ogg', 'm4a', 'aac', 'srt', 'vtt', 'sub'] },
      { name: 'Video Files', extensions: ['mp4', 'mkv', 'webm', 'avi', 'mov', 'flv', 'wmv'] },
      { name: 'Audio Files', extensions: ['mp3', 'flac', 'wav', 'ogg', 'm4a', 'aac'] },
      { name: 'Subtitle Files', extensions: ['srt', 'vtt', 'sub'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (result.canceled || !result.filePaths) {
    return [];
  }
  return result.filePaths;
});

// Native OS Open Directory Dialog
ipcMain.handle('dialog-open-folder', async () => {
  if (!mainWindow) return [];
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Media Folder',
    properties: ['openDirectory']
  });

  if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
    return [];
  }

  const folderPath = result.filePaths[0];
  try {
    const files = fs.readdirSync(folderPath);
    const mediaExtensions = ['.mp4', '.mkv', '.webm', '.avi', '.mov', '.mp3', '.flac', '.wav', '.ogg'];
    const mediaFiles = files
      .filter(f => mediaExtensions.includes(path.extname(f).toLowerCase()))
      .map(f => path.join(folderPath, f));
    return mediaFiles;
  } catch (err) {
    console.error('Error reading folder:', err);
    return [];
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
