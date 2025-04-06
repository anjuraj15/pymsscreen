const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let flaskProcess;

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  win.loadFile(path.join(__dirname, '../dist/index.html'));
  win.webContents.openDevTools();
}

function getBackendBinaryPath() {
  const platform = process.platform;
  const isProd = app.isPackaged;

  const binaryName = {
    win32: 'web_app.exe',
    darwin: 'web_app_macos',
    linux: 'web_app_linux'
  }[platform];

  if (!binaryName) {
    throw new Error(`Unsupported platform: ${platform}`);
  }

  return isProd
    ? path.join(process.resourcesPath, 'backend', binaryName)
    : path.join(__dirname, '..', 'public', 'backend', binaryName);
}

function startFlask() {
  const exePath = getBackendBinaryPath();

  flaskProcess = spawn(exePath, [], {
    shell: process.platform === 'win32', // Only use shell on Windows
    stdio: 'pipe'
  });

  flaskProcess.stdout.on('data', (data) => {
    console.log(`[Flask] ${data}`);
  });

  flaskProcess.stderr.on('data', (data) => {
    console.error(`[Flask Error] ${data}`);
  });

  flaskProcess.on('error', (err) => {
    console.error(`[Flask Failed to Start] ${err}`);
  });

  flaskProcess.on('exit', (code) => {
    console.log(`[Flask Exited] Code: ${code}`);
  });
}

ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
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
