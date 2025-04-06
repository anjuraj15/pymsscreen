const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const { ipcMain, dialog } = require('electron');

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

function startFlask() {
  const isProd = app.isPackaged;
  const platform = process.platform;
  let exePath;

  if (isProd) {
    if (platform === 'win32') {
      exePath = path.join(process.resourcesPath, 'backend', 'web_app.exe');
    } else if (platform === 'darwin') {
      exePath = path.join(process.resourcesPath, 'backend', 'web_app_macos');
    } else {
      exePath = path.join(process.resourcesPath, 'backend', 'web_app_linux');
    }
  } else {
    exePath = path.join(__dirname, 'public', 'backend', {
      win32: 'web_app.exe',
      darwin: 'web_app_macos',
      linux: 'web_app_linux'
    }[platform]);
  }

  flaskProcess = spawn(exePath, [], { shell: true });

  flaskProcess.stdout.on('data', (data) => {
    console.log(`[Flask] ${data}`);
  });

  flaskProcess.stderr.on('data', (data) => {
    console.error(`[Flask error] ${data}`);
  });

  flaskProcess.on('error', (err) => {
    console.error('[Flask failed to start]', err);
  });
}

ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  if (result.canceled) return null;
  return result.filePaths[0];
});

app.whenReady().then(() => {
  startFlask();
  createWindow();
});

app.on('window-all-closed', () => {
  if (flaskProcess) flaskProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});
