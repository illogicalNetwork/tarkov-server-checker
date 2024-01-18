const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');

ipcMain.handle('get-user-data-path', (event, arg) => {
  return app.getPath('userData');
});

function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    win.loadFile('index.html');
    win.setMenuBarVisibility(false);
}

app.whenReady().then(createWindow);

ipcMain.handle('open-file-dialog', async () => {
    return dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'Logs', extensions: ['log'] }]
    });
});