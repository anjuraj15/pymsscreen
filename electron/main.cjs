const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { spawn } = require('child_process');
const { pathToFileURL } = require('url');

let flaskProcess;

function getBackendBinaryPath() {
  const binaryPath = path.join(process.resourcesPath, 'backend', 'web_app');
  return binaryPath;
}

  const isProd = app.isPackaged;
  const binaryPath = isProd
    ? path.join(process.resourcesPath, 'backend', binaryName)
    : path.join(__dirname, '..', 'public', 'backend', binaryName);

  return binaryPath;
}

function startFlask() {

  function getBackendBinaryPath() {
    const binaryPath = app.isPackaged
      ? path.join(process.resourcesPath, 'backend', 'web_app')
      : path.join(__dirname, '..', 'public', 'backend', {
          win32: 'web_app.exe',
          darwin: 'web_app_macos',
          linux: 'web_app_linux'
        }[os.platform()]);
  
    return binaryPath;
  }

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
    win.webContents.openDevTools(); // Only in development
  } else {
    const { pathToFileURL } = require('url');
    const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
    win.loadURL(pathToFileURL(indexPath).toString());
  }
}

ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
  });
  return result.canceled ? null : result.filePaths[0];
});

app.whenReady().then(() => {
  startFlask();
  createWindow();
});

app.on('window-all-closed', () => {
  if (flaskProcess) flaskProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (flaskProcess) flaskProcess.kill();
});
