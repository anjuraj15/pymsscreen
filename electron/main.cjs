const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const os = require('os');
const http = require('http');

let flaskProcess;

function getBackendBinaryPath() {
  const isDev = !app.isPackaged;
  const backendBasePath = isDev
    ? path.join(__dirname, 'public', 'backend')
    : path.join(process.resourcesPath, 'backend');

  switch (os.platform()) {
    case 'win32':
      return path.join(backendBasePath, 'web_app.exe');
    case 'darwin':
      return path.join(backendBasePath, 'web_app_macos');
    case 'linux':
      return path.join(backendBasePath, 'web_app_linux');
    default:
      throw new Error(`Unsupported platform: ${os.platform()}`);
  }
}

function startBackend() {
  const binaryPath = getBackendBinaryPath();

  flaskProcess = spawn(binaryPath, [], {
    detached: true,
    stdio: 'ignore',
  });

  flaskProcess.unref();
}

function waitForBackend(url, tries = 20, delay = 500) {
  return new Promise((resolve, reject) => {
    const tryRequest = (attempt = 0) => {
      http.get(url, res => {
        if (res.statusCode === 200) {
          resolve();
        } else {
          retry(attempt);
        }
      }).on('error', () => retry(attempt));
    };

    const retry = (attempt) => {
      if (attempt >= tries) {
        reject(new Error('Backend did not start in time'));
      } else {
        setTimeout(() => tryRequest(attempt + 1), delay);
      }
    };

    tryRequest();
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  win.loadURL('http://localhost:5000');
}

app.whenReady().then(() => {
  startBackend();

  waitForBackend('http://localhost:5000')
    .then(() => {
      createWindow();
    })
    .catch(err => {
      console.error('❌ Backend failed to start:', err.message);
      app.quit();
    });
});

app.on('before-quit', () => {
  if (flaskProcess) {
    try {
      process.kill(-flaskProcess.pid); // Clean up
    } catch (e) {
      console.warn('⚠️  Could not kill backend process:', e.message);
    }
  }
});

