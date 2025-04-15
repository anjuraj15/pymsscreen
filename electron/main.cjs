const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { spawn } = require('child_process');
const { pathToFileURL } = require('url');
const http = require('http');

win.loadURL('data:text/html,<h2>Loading backend, please wait...</h2>');

function waitForBackend(url = 'http://127.0.0.1:5000/ping', timeout = 300000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();

    function check() {
      http.get(url, (res) => {
        if (res.statusCode === 200) return resolve(true);
        retry();
      }).on('error', retry);
    }

    function retry() {
      if (Date.now() - start > timeout) {
        return reject(new Error('Backend not responding in time.'));
      }
      setTimeout(check, 500);
    }

    check();
  });
}

let flaskProcess;

//  Platform-aware backend binary path
function getBackendBinaryPath() {
  const platformBinaryName = {
    win32: 'web_app.exe',
    darwin: 'web_app_macos',
    linux: 'web_app_linux',
  }[os.platform()] || 'web_app';

  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'backend', platformBinaryName);
  }

  return path.join(__dirname, '..', 'public', 'backend', platformBinaryName);
}

//  Launch backend server (Flask or Python binary)
function startFlask() {
  const backendPath = getBackendBinaryPath();
  const shell = os.platform() === 'win32' || os.platform() === 'darwin';

  const logDir = app.getPath('userData');
  const logFile = path.join(logDir, 'flask-backend.log');

  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const out = fs.openSync(logFile, 'a');
  const err = fs.openSync(logFile, 'a');

  console.log(`[Electron] Starting backend from: ${backendPath}`);
  console.log(`[Electron] Logging to: ${logFile}`);

  console.log(`[Electron] Checking existence: ${fs.existsSync(backendPath)}`);
  try {
    fs.accessSync(backendPath, fs.constants.X_OK);
    console.log(`[Electron]  Backend binary is executable`);
  } catch (err) {
    console.error(`[Electron] Backend binary is NOT executable:`, err);
  }

  try {
    flaskProcess = spawn(backendPath, [], {
      shell,
      detached: true,
      stdio: ['ignore', out, err],
    });

    flaskProcess.on('error', (err) => {
      console.error(`[Electron] Failed to spawn: ${err.message}`);
      fs.appendFileSync(logFile, `Spawn error: ${err.message}\n`);
    });

    flaskProcess.unref();
  } catch (e) {
    console.error(`[Electron] Exception during spawn: ${e}`);
    fs.appendFileSync(logFile, `Exception during spawn: ${e.message}\n`);
  }
}

//  Create the Electron window
function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
    },
  });

  if (!app.isPackaged) {
    // wait-on is only used in development
    const waitOn = require('wait-on');
    waitOn({ resources: ['http://127.0.0.1:5000'], timeout: 20000 }, (err) => {
      if (err) {
        console.error('Backend not ready:', err);
        win.loadURL('data:text/html,<h2>Backend failed to start.</h2>');
      } else {
        win.loadURL('http://localhost:5173');
        win.webContents.openDevTools();
      }
    });
  } else {
    const indexPath = path.join(__dirname, '..', 'dist', 'index.html');

    waitForBackend()
      .then(() => {
        console.log('[Electron] Backend is ready. Loading frontend...');
        win.loadURL(pathToFileURL(indexPath).toString());
      })
      .catch((err) => {
        console.error('[Electron] Backend did not respond:', err);
        dialog.showErrorBox(
          'Backend Startup Failed',
          'The backend server failed to start. Please try restarting the app.'
        );
        win.loadURL('data:text/html,<h2>Backend failed to start.</h2>');
      });
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