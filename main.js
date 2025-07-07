const { app, BrowserWindow, shell, ipcMain, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

const RPC = require('discord-rpc');

const clientId = '1391756250810810408';
const rpc = new RPC.Client({ transport: 'ipc' });

let startTimestamp = new Date();

// Gestion des erreurs
process.on('uncaughtException', (error) => {
  console.error('[Main] Erreur non gérée:', error);
});
process.on('unhandledRejection', (reason) => {
  console.error('[Main] Promesse non gérée:', reason);
});

function getAppPath() {
  if (process.env.NODE_ENV === 'development') {
    return path.resolve(__dirname);
  }
  const userDataPath = app.getPath('userData');
  const appDataDir = path.join(userDataPath, 'OpenFrontApp');
  const modsPath = path.join(appDataDir, 'mods');

  if (!fs.existsSync(modsPath)) {
    fs.mkdirSync(modsPath, { recursive: true });
    const builtInModsPath = path.join(process.resourcesPath, 'mods');
    if (fs.existsSync(builtInModsPath)) {
      const files = fs.readdirSync(builtInModsPath);
      for (const file of files) {
        fs.copyFileSync(
          path.join(builtInModsPath, file),
          path.join(modsPath, file)
        );
      }
      console.log("Mods de base copiés dans", modsPath);
    }
  }

  return appDataDir;
}

const basePath = getAppPath();
console.log('Chemin des données:', basePath);

function createWindow() {
  const iconPath = path.join(__dirname, 'assets', 'icon.png');
  let icon = null;

  if (fs.existsSync(iconPath)) {
    icon = nativeImage.createFromPath(iconPath);
    if (icon.isEmpty()) {
      console.warn("Le fichier d'icône n'a pas pu être chargé");
      icon = null;
    }
  }

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true,
    icon: icon,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  if (process.platform === 'win32') {
    app.setAppUserModelId('com.openfront.app');
  }

  if (process.platform === 'darwin' && icon) {
    app.dock.setIcon(icon);
  }

  win.setTitle("OpenFront App");
  win.loadURL('https://twitch.tv');

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://twitch.tv')) {
      return { action: 'allow' };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('https://twitch.tv')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  ipcMain.on('open-devtools', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) {
      win.webContents.openDevTools();
    }
  });

  win.webContents.on('before-input-event', (event, input) => {
    if ((input.control || input.meta) && input.shift && input.key.toLowerCase() === 'i') {
      win.webContents.openDevTools();
    }
  });

  return win;
}

let mainWindow = null;

app.whenReady().then(() => {
  mainWindow = createWindow();

  rpc.on('ready', () => {
    console.log('[Discord RPC] Connecté');

    const twitchBase = 'https://www.twitch.tv/';
    let lastUrl = '';

    function updatePresence(url) {
      if (url === lastUrl) return; // rien à faire si pas de changement
      lastUrl = url;

      if (url.startsWith(twitchBase) && url.length > twitchBase.length) {
        const streamer = url.substring(twitchBase.length).split('/')[0];
        if (streamer && !['videos', 'directory', 'search', 'clip'].includes(streamer)) {
          console.log(`📺 Stream détecté : ${streamer}`);
          rpc.setActivity({
            details: 'Regarde un stream',
            state: `Streamer : ${streamer}`,
            startTimestamp: new Date(),
            largeImageKey: 'twitch',
            largeImageText: 'Twitch',
            instance: false,
            buttons: [
              {
                label: 'Regarder le stream',
                url: `https://google.com`
              }
            ]
          });
          return;
        }
      }

      console.log("🔘 Pas de stream détecté, présence par défaut.");
      rpc.setActivity({
        details: "Sur Twitch",
        state: `Menu principal`,
        startTimestamp: new Date(),
        largeImageKey: 'twitch',
        largeImageText: 'Twitch',
        smallImageKey: 'twitch',
        smallImageText: 'Twitch',   
      });
    }

    // 👀 Scraper dynamiquement l'URL toutes les secondes
    setInterval(() => {
      if (!mainWindow || !mainWindow.webContents) return;
      mainWindow.webContents.executeJavaScript('window.location.href')
        .then(url => {
          updatePresence(url);
        })
        .catch(err => {
          console.error('Erreur lors de la lecture de l’URL :', err);
        });
    }, 1000);
  });


  rpc.login({ clientId }).catch(console.error);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    mainWindow = createWindow();
  }
});
