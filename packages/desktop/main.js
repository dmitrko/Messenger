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
        icon: path.join(__dirname, 'public/assets/icq-classic/app_icon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            nativeWindowOpen: true
        },
    });

    // Configure Native Multi-Window Dispatcher
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        const parsedUrl = new URL(url);
        const mode = parsedUrl.searchParams.get('mode');
        const chat = parsedUrl.searchParams.get('chat');

        let options = {
            width: 480,
            height: 420,
            autoHideMenuBar: true,
            titleBarStyle: 'default',
            webPreferences: {
                preload: path.join(__dirname, 'preload.js'),
                contextIsolation: true,
                nodeIntegration: false
            }
        };

        if (mode === 'add_contact') {
            options.width = 300;
            options.height = 450;
            options.resizable = false;
        } else if (mode === 'incoming_auth') {
            options.width = 320;
            options.height = 300;
            options.resizable = false;
            options.alwaysOnTop = true;
        } else if (chat) {
            // Already standard 480x420
        }

        return { action: 'allow', overrideBrowserWindowOptions: options };
    });

    // Helper to open specific windows from renderer
    ipcMain.on('open-window', (event, args) => {
        const { mode, chatUin, urlParams } = args;

        let subWin = new BrowserWindow({
            width: 300,
            height: 450,
            resizable: false,
            autoHideMenuBar: true,
            title: 'NostaChat',
            icon: path.join(__dirname, 'public/assets/icq-classic/app_icon.png'),
            webPreferences: {
                preload: path.join(__dirname, 'preload.js'),
                contextIsolation: true,
                nodeIntegration: false
            }
        });

        if (mode === 'incoming_auth') {
            subWin.setSize(320, 300);
            subWin.setAlwaysOnTop(true);
        }

        const query = {};
        if (urlParams) {
            const p = new URLSearchParams(urlParams);
            p.forEach((val, key) => { query[key] = val; });
        } else {
            if (mode) query.mode = mode;
            if (chatUin) query.chat = chatUin;
        }

        if (isDev) {
            const params = new URLSearchParams(query).toString();
            subWin.loadURL(`http://localhost:5173?${params}`);
        } else {
            subWin.loadFile(path.join(__dirname, 'dist/index.html'), { query });
        }
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

    const chatWin = new BrowserWindow({
        width: 480,
        height: 420,
        title: `${username} (${uin}) - Chat`,
        autoHideMenuBar: true,
        icon: path.join(__dirname, 'public/assets/icq-classic/flower.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    const suffix = `?chat=${uin}`;
    if (isDev) {
        chatWin.loadURL(`http://localhost:5173${suffix}`);
    } else {
        chatWin.loadFile(path.join(__dirname, 'dist/index.html'), { query: { chat: uin } });
    }

    chatWindows.set(uin, chatWin);
    chatWin.on('closed', () => chatWindows.delete(uin));
});

// Dynamic window resizing
ipcMain.on('resize-window', (event, { width, height }) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
        win.setSize(width, height);
        win.center();
    }
});

app.whenReady().then(createMainWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
