const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { spawn } = require('child_process');
const { pathToFileURL } = require('url');

let flaskProcess;

//  Platform-aware backend binary path
function getBackendBinaryPath() {
  if (app.isPackaged) {
    return path.join(
      process.resourcesPath,
      'backend',
      os.platform() === 'win32' ? 'web_app.exe' : 'web_app'
    );
  }

  const platformBinaryName = {
    win32: 'web_app.exe',
    darwin: 'web_app_macos',
    linux: 'web_app_linux'
  }[os.platform()] || 'web_app';

  return path.join(__dirname, '..', 'public', 'backend', platformBinaryName);
}

//  Launch backend server (Flask or Python binary)
function startFlask() {
  const backendPath = getBackendBinaryPath();
  const shell = os.platform() === 'win32' || os.platform() === 'darwin';

  const logDir = app.getPath('userData');
  const logFile = path.join(logDir, 'flask-backend.log');
  const out = fs.openSync(logFile, 'a');
  const err = fs.openSync(logFile, 'a');

  console.log(`[Electron] Starting backend from: ${backendPath}`);

  try {
    flaskProcess = spawn(backendPath, [], {
      shell,
      detached: true,
      stdio: ['ignore', out, err],
    });

    flaskProcess.unref();
  } catch (e) {
    console.error(`[Electron] Failed to spawn backend: ${e}`);
  }
}

// 🪟 Create the Electron window
function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
    },
  });

  const isDev = !app.isPackaged;

  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools(); // Optional: dev tools
  } else {
    const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
    win.loadURL(pathToFileURL(indexPath).toString());
  }
}

//  Directory selection via dialog
ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
  });
  return result.canceled ? null : result.filePaths[0];
});

//  App ready
app.whenReady().then(() => {
  startFlask();
  createWindow();
});

//  Kill backend on all window close
app.on('window-all-closed', () => {
  if (flaskProcess) flaskProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});

//  Kill backend on quit
app.on('before-quit', () => {
  if (flaskProcess) flaskProcess.kill();
});
