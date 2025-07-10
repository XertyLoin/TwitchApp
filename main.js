const { app, BrowserWindow, shell, ipcMain, nativeImage, session } = require('electron');
const path = require('path');
const fs = require('fs');
const RPC = require('discord-rpc');

const clientId = '1391756250810810408';
const rpc = new RPC.Client({ transport: 'ipc' });

let startTimestamp = new Date();
let mainWindow = null;
let pubDetected = false;
let hasReloaded = false; // Drapeau pour éviter les rechargements multiples

// Gestion des erreurs
process.on('uncaughtException', (error) => console.error('[Main] Erreur non gérée:', error));
process.on('unhandledRejection', (reason) => console.error('[Main] Promesse non gérée:', reason));

function getAppPath() {
  if (process.env.NODE_ENV === 'development') return path.resolve(__dirname);
  const userDataPath = app.getPath('userData');
  const appDataDir = path.join(userDataPath, 'OpenFrontApp');
  const modsPath = path.join(appDataDir, 'mods');

  if (!fs.existsSync(modsPath)) {
    fs.mkdirSync(modsPath, { recursive: true });
    const builtInModsPath = path.join(process.resourcesPath, 'mods');
    if (fs.existsSync(builtInModsPath)) {
      const files = fs.readdirSync(builtInModsPath);
      for (const file of files) {
        fs.copyFileSync(path.join(builtInModsPath, file), path.join(modsPath, file));
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
  let icon = fs.existsSync(iconPath) ? nativeImage.createFromPath(iconPath) : null;

  if (icon && icon.isEmpty()) {
    console.warn("L’icône n’a pas pu être chargée.");
    icon = null;
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

  win.setTitle("OpenFront App");
  win.loadURL('https://twitch.tv');

  win.webContents.setWindowOpenHandler(({ url }) => {
    console.log('Tentative d’ouverture d’URL:', url);
    if (url.includes('twitch.tv') || url.includes('passport.twitch.tv')) {
      return { action: 'allow' };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    console.log('Navigation vers:', url);
    if (!url.includes('twitch.tv') && !url.includes('passport.twitch.tv')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  win.webContents.on('did-finish-load', () => {
    // Vérifier les cookies pour confirmer l'état de connexion
    session.defaultSession.cookies.get({ url: 'https://twitch.tv' })
      .then(cookies => {
        const isLoggedIn = cookies.some(cookie => cookie.name === 'auth-token');
        console.log('État de connexion:', isLoggedIn ? 'Connecté' : 'Non connecté');
        if (isLoggedIn && !hasReloaded) {
          console.log('Utilisateur connecté, rechargement unique de la page');
          hasReloaded = true; // Empêche les rechargements multiples
          win.loadURL('https://twitch.tv'); // Rechargement explicite
        } else if (!isLoggedIn) {
          hasReloaded = false; // Réinitialiser pour permettre un futur rechargement
        }
      })
      .catch(err => console.error('Erreur lors de la vérification des cookies:', err));

    // Injecter le script pour bloquer les pubs
    win.webContents.executeJavaScript(`
      const origFetch = window.fetch;
      window.fetch = function(url, options) {
        if (typeof url === 'string' && url.includes('/gql')) {
          if (options && options.body && options.body.includes('PlaybackAccessToken_Ads')) {
            console.log('🔁 PlaybackAccessToken_Ads bloqué');
            return Promise.reject('Ad request blocked');
          }
        }
        return origFetch.apply(this, arguments);
      };
    `).catch(err => console.error("Erreur d'injection JS:", err));
  });

  ipcMain.on('open-devtools', () => {
    const currentWin = BrowserWindow.getFocusedWindow();
    if (currentWin) {
      currentWin.webContents.openDevTools();
    }
  });

  win.webContents.on('before-input-event', (event, input) => {
    if ((input.control || input.meta) && input.shift && input.key.toLowerCase() === 'i') {
      win.webContents.openDevTools();
    }
  });

  return win;
}

function updateDiscordPresence(url) {
  const twitchBase = 'https://www.twitch.tv/';
  const isStream = url.startsWith(twitchBase) && url.length > twitchBase.length;
  const pathSection = url.substring(twitchBase.length).split('/')[0];
  const isValidStream = isStream && !['videos', 'directory', 'search', 'clip'].includes(pathSection);

  if (pubDetected) {
    console.log('🟡 Mise à jour Discord : Pub détectée');
    rpc.setActivity({
      details: 'Regarde une publicité (🤮)',
      state: 'Twitch affiche des pubs...',
      startTimestamp,
      largeImageKey: 'twitch',
      largeImageText: 'Publicité 😢',
      instance: false
    });
    pubDetected = false;
    return;
  }

  if (isValidStream) {
    console.log(`📺 Stream détecté : ${pathSection}`);
    rpc.setActivity({
      details: 'Regarde un stream',
      state: `Streamer : ${pathSection}`,
      startTimestamp,
      largeImageKey: 'twitch',
      largeImageText: 'Twitch',
      instance: false,
      buttons: [
        {
          label: 'Regarder le stream',
          url: url
        }
      ]
    });
  } else {
    console.log('🔘 Présence Discord : Menu Twitch');
    rpc.setActivity({
      details: 'Sur Twitch',
      state: 'Menu principal',
      startTimestamp,
      largeImageKey: 'twitch',
      smallImageKey: 'twitch',
      largeImageText: 'Twitch'
    });
  }
}

app.whenReady().then(() => {
  // Assurer la persistance des cookies
  session.defaultSession.setPermissionRequestHandler((weblamda, permission, callback) => {
    callback(true); // Accepter toutes les permissions (par exemple, pour l'authentification)
  });

  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    const url = details.url;
    const adDomains = [
      'doubleclick.net', 'googlesyndication.com', 'ads.twitch.tv'
    ];

    if (adDomains.some(domain => url.includes(domain))) {
      console.log(`🔒 Domaine publicitaire bloqué : ${url}`);
      return callback({ cancel: true });
    }

    if (url.includes('gql') && details.uploadData?.length) {
      const body = details.uploadData[0].bytes.toString();
      if (body.includes('PlaybackAccessToken_Ads')) {
        console.log('🚫 Requête pub Twitch détectée (PlaybackAccessToken_Ads)');
        pubDetected = true;
        return callback({ cancel: true });
      }
    }

    callback({ cancel: false });
  });

  mainWindow = createWindow();

  rpc.on('ready', () => {
    console.log('[Discord RPC] Connecté à Discord');
    setInterval(() => {
      if (!mainWindow?.webContents) return;
      mainWindow.webContents.executeJavaScript('window.location.href')
        .then(updateDiscordPresence)
        .catch(err => console.error('Erreur lecture URL :', err));
    }, 1000);
  });

  rpc.login({ clientId }).catch(console.error);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    mainWindow = createWindow();
  }
});