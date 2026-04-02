const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

if (process.env.PORTABLE_EXECUTABLE_DIR) {
    app.setPath('userData', path.join(process.env.PORTABLE_EXECUTABLE_DIR, 'nostachat-data'));
} else {
    app.setPath('userData', path.join(app.getAppPath(), '..', 'nostachat-data'));
}

let mainWindow = null;
const chatWindows = new Map();

function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 280,
        height: 520,
        title: 'ICQ',
        resizable: true,
        autoHideMenuBar: true,
        icon: path.join(__dirname, 'public/assets/icq-classic/flower.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
    } else {
        mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
        app.quit();
    });
}

// IPC for Opening Chat Windows
ipcMain.on('open-chat', (event, { uin, username }) => {
    if (chatWindows.has(uin)) {
        chatWindows.get(uin).focus();
        return;
    }

    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    const chatWin = new BrowserWindow({
        width: 480,
        height: 420,
        title: `${username} (${uin}) - Chat`,
        icon: path.join(__dirname, 'public/assets/icq-classic/flower.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    if (isDev) {
        chatWin.loadURL(`http://localhost:5173#/chat/${uin}`);
    } else {
        chatWin.loadURL(`file://${path.join(__dirname, 'dist/index.html')}#/chat/${uin}`);
    }

    chatWindows.set(uin, chatWin);
    chatWin.on('closed', () => chatWindows.delete(uin));
});

// Update Title with UIN info
ipcMain.on('update-title', (event, title) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.setTitle(title);
});

app.whenReady().then(createMainWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
