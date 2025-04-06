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

  // Load your React build output
  win.loadFile(path.join(__dirname, '../dist/index.html'));
  win.webContents.openDevTools();
}

function startFlask() {
  const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
  flaskProcess = spawn(pythonCmd, ['web_app.py'], {
    cwd: path.join(__dirname, '..'),
    shell: true
  });

  flaskProcess.stdout.on('data', (data) => {
    console.log(`[Flask] ${data}`);
  });

  flaskProcess.stderr.on('data', (data) => {
    console.error(`[Flask error] ${data}`);
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
