const path = require('path');
const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');

let backendProcess;

function getBackendBinary() {
  const isDev = !app.isPackaged;
  const platform = process.platform; // 'darwin', 'linux', 'win32'

  const baseDir = isDev
    ? path.join(__dirname, '..', 'public', 'backend')
    : path.join(process.resourcesPath, 'backend');

  const binaryMap = {
    win32: 'web_app.exe',
    darwin: 'web_app_macos',
    linux: 'web_app_linux'
  };

  return path.join(baseDir, binaryMap[platform] || 'web_app');
}

function startBackend() {
  const backendPath = getBackendBinary();

  backendProcess = spawn(backendPath, [], {
    stdio: 'inherit',
    detached: false
  });

  backendProcess.on('error', (err) => {
    console.error('❌ Failed to start backend:', err.message);
  });

  backendProcess.on('exit', (code, signal) => {
    console.log(`⚠️ Backend exited. Code: ${code}, Signal: ${signal}`);
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  const indexPath = app.isPackaged
    ? `file://${path.join(__dirname, '../dist/index.html')}`
    : 'http://localhost:5173'; // adjust if you're using a different Vite port

  win.loadURL(indexPath);
}


const http = require('http');

function waitForBackend(retries = 20) {
  return new Promise((resolve, reject) => {
    const check = () => {
      http.get('http://localhost:5000', (res) => {
        if (res.statusCode === 200) resolve();
        else retry();
      }).on('error', retry);
    };
    const retry = () => {
      if (--retries === 0) return reject(new Error('Backend did not start'));
      setTimeout(check, 1000);
    };
    check();
  });
}



app.whenReady().then(() => {
  startBackend();
  createWindow();
});

app.on('window-all-closed', () => {
  if (backendProcess) backendProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
