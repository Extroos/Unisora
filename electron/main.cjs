const { app, BrowserWindow, Menu, Tray, ipcMain, shell, session } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const url = require('url');
const { autoUpdater } = require('electron-updater');

let mainWindow = null;
let tray = null;
let checkInterval = null;

const isDev = !app.isPackaged;
const DEFAULT_PORT = 3001;
let serverUrl = 'discovery';

// Load server configuration from AppData
function loadServerConfig() {
  const configPath = path.join(app.getPath('userData'), 'server-config.json');
  if (fs.existsSync(configPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (data.serverUrl) {
        serverUrl = data.serverUrl;
      }
    } catch (err) {
      console.error('Failed to parse server config:', err);
    }
  }
}

// Save server configuration to AppData
function saveServerConfig(newUrl) {
  const configPath = path.join(app.getPath('userData'), 'server-config.json');
  try {
    fs.writeFileSync(configPath, JSON.stringify({ serverUrl: newUrl }), 'utf8');
    serverUrl = newUrl;
  } catch (err) {
    console.error('Failed to save server config:', err);
  }
}

// Start local Express server in-process to ensure correct ASAR module resolution
function startBackendServer() {
  if (isDev) {
    console.log('Running in Development mode - assuming backend server is already running.');
    return;
  }

  const serverPath = path.join(app.getAppPath(), 'dist-server', 'server.cjs');
  const appDataDir = app.getPath('userData');

  console.log(`Starting background server in-process at ${serverPath} with AppData dir: ${appDataDir}`);

  // Set environment variables for the current process
  process.env.SERVER_PORT = String(DEFAULT_PORT);
  process.env.APPDATA_DIR = appDataDir;
  process.env.NODE_ENV = 'production';

  try {
    require(serverPath);
    console.log('Backend server required successfully.');
  } catch (err) {
    console.error('Failed to start backend server process:', err);
  }
}

// Check if a remote or local HTTP/HTTPS server is online
function checkServer(targetUrl, callback) {
  try {
    const parsed = url.parse(targetUrl);
    const client = parsed.protocol === 'https:' ? https : http;
    
    const req = client.request({
      method: 'GET',
      protocol: parsed.protocol,
      host: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.path || '/',
      timeout: 1000
    }, (res) => {
      // Any response code means the server is online
      callback(true);
    });

    req.on('error', () => callback(false));
    req.on('timeout', () => {
      req.destroy();
      callback(false);
    });
    req.end();
  } catch (err) {
    callback(false);
  }
}

let updateChecked = false;

function loadAppWhenReady(window) {
  if (isDev) {
    window.loadURL('http://localhost:3000');
    window.webContents.openDevTools();
    return;
  }

  // Render a simple loading page first to prevent white flash/error
  window.loadFile(path.join(__dirname, 'loading.html'));

  if (checkInterval) {
    clearInterval(checkInterval);
  }

  const startCheckingServer = () => {
    const check = () => {
      if (serverUrl.trim().toLowerCase() === 'discovery') {
        const appKey = '4vhnafof';
        const fetchUrl = `https://keyvalue.immanuel.co/api/KeyVal/GetValue/${appKey}/serverUrl`;
        
        // Resolve public dynamic IP registry directly
        https.get(fetchUrl, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              let base64Str = data.trim();
              if (base64Str.startsWith('"') && base64Str.endsWith('"')) {
                base64Str = base64Str.slice(1, -1);
              }
              if (base64Str) {
                const decodedUrl = Buffer.from(base64Str, 'base64').toString('utf8');
                checkServer(decodedUrl, (online) => {
                  if (online) {
                    clearInterval(checkInterval);
                    window.loadURL(decodedUrl);
                  }
                });
              }
            } catch (err) {
              // ignore
            }
          });
        }).on('error', (err) => {
          console.error('Failed to fetch discovery URL:', err);
        });
      } else {
        checkServer(serverUrl, (online) => {
          if (online) {
            clearInterval(checkInterval);
            window.loadURL(serverUrl);
          }
        });
      }
    };

    check();
    checkInterval = setInterval(check, 1500);
  };

  // If in production and we haven't completed update checking, perform update check first
  if (!isDev && !updateChecked) {
    // Send initial status after a short delay
    setTimeout(() => {
      if (window && !window.isDestroyed()) {
        window.webContents.send('update-message', 'Checking for updates...');
      }
    }, 500);

    autoUpdater.checkForUpdates().then((result) => {
      if (!result || !result.updateInfo) {
        updateChecked = true;
        if (window && !window.isDestroyed()) {
          window.webContents.send('update-message', 'Starting Unisora...');
        }
        startCheckingServer();
      }
    }).catch((err) => {
      console.error('Auto-update check failed, launching app:', err);
      updateChecked = true;
      if (window && !window.isDestroyed()) {
        window.webContents.send('update-message', 'Starting Unisora...');
      }
      startCheckingServer();
    });
  } else {
    startCheckingServer();
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 940,
    minHeight: 500,
    frame: false,
    titleBarStyle: 'hidden',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.setMenuBarVisibility(false);

  // Override User-Agent to bypass Google's block on Electron webviews
  const userAgent = mainWindow.webContents.getUserAgent()
    .replace(/Electron\/\S+\s?/g, '')
    .replace(/Unisora\/\S+\s?/g, '');
  mainWindow.webContents.setUserAgent(userAgent);

  // Allow Ctrl+Shift+I to open DevTools in production for debugging
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.control && input.shift && input.key.toLowerCase() === 'i') {
      mainWindow.webContents.toggleDevTools();
      event.preventDefault();
    }
  });

  loadAppWhenReady(mainWindow);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  const iconPath = path.join(__dirname, 'icon.png');
  tray = new Tray(iconPath);
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show App',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
        } else {
          createWindow();
        }
      }
    },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      }
    }
  ]);

  tray.setToolTip('Unisora');
  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
    } else {
      createWindow();
    }
  });
}

// IPC Handlers
ipcMain.handle('get-server-url', () => {
  return serverUrl;
});

ipcMain.on('set-server-url', (event, newUrl) => {
  saveServerConfig(newUrl);
  if (mainWindow) {
    loadAppWhenReady(mainWindow);
  }
});

let oauthServer = null;
function startOAuthLoopbackServer() {
  if (oauthServer) return;
  oauthServer = http.createServer((req, res) => {
    try {
      const parsedUrl = url.parse(req.url, true);
      const code = parsedUrl.query.code;
      
      res.writeHead(200, { 'Content-Type': 'text/html' });
      if (code) {
        if (mainWindow) {
          mainWindow.webContents.send('google-oauth-code', code);
        }
        res.end(`
          <html>
            <head>
              <title>Unisora Auth</title>
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                  background-color: #111214;
                  color: #dbdee1;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  height: 100vh;
                  margin: 0;
                  -webkit-font-smoothing: antialiased;
                }
                .content {
                  text-align: center;
                }
                h1 {
                  font-size: 20px;
                  font-weight: 500;
                  color: #ffffff;
                  margin: 0 0 8px 0;
                }
                p {
                  font-size: 14px;
                  color: #949ba4;
                  margin: 0;
                }
              </style>
            </head>
            <body>
              <div class="content">
                <h1>Signed in successfully</h1>
                <p>You can close this window and return to Unisora.</p>
              </div>
              <script>
                setTimeout(() => { window.close(); }, 1500);
              </script>
            </body>
          </html>
        `);
      } else {
        res.end('No authorization code found in redirect URL.');
      }
    } catch (e) {
      res.writeHead(500);
      res.end('Internal server error.');
    }
  });

  oauthServer.listen(3002, '127.0.0.1', () => {
    console.log('Google OAuth loopback server listening on http://127.0.0.1:3002');
  });
}

ipcMain.on('open-google-login', (event, clientID) => {
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientID}&redirect_uri=http://127.0.0.1:3002&response_type=code&scope=openid%20profile%20email`;
  shell.openExternal(authUrl);
});

// Custom Titlebar IPC listeners
ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

// Lifecycle Hooks
app.whenReady().then(() => {
  // Grant media permissions (microphone, camera, media device query) to the application
  session.defaultSession.setPermissionCheckHandler((webContents, permission, requestingOrigin) => {
    if (permission === 'media') return true;
    return false;
  });

  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media') {
      callback(true);
    } else {
      callback(false);
    }
  });

  loadServerConfig();
  startBackendServer();
  startOAuthLoopbackServer();
  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Auto-Updater Listeners
autoUpdater.on('checking-for-update', () => {
  if (mainWindow) mainWindow.webContents.send('update-message', 'Checking for updates...');
});

autoUpdater.on('update-available', (info) => {
  if (mainWindow) mainWindow.webContents.send('update-message', `Downloading update (v${info.version})...`);
});

autoUpdater.on('update-not-available', () => {
  if (mainWindow) mainWindow.webContents.send('update-message', 'Starting Unisora...');
  updateChecked = true;
});

autoUpdater.on('error', (err) => {
  if (mainWindow) mainWindow.webContents.send('update-message', 'Starting Unisora...');
  updateChecked = true;
});

autoUpdater.on('download-progress', (progressObj) => {
  if (mainWindow) {
    const percent = Math.round(progressObj.percent);
    mainWindow.webContents.send('update-message', `Downloading update (${percent}%)`);
  }
});

autoUpdater.on('update-downloaded', () => {
  if (mainWindow) {
    mainWindow.webContents.send('update-message', 'Update downloaded. Restarting...');
  }
  setTimeout(() => {
    autoUpdater.quitAndInstall();
  }, 1500);
});
