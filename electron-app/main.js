// 【変更】'dialog' モジュールを追加で読み込みます
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

function createWindow () {
    const win = new BrowserWindow({
        width: 400,
        height: 300,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    });

    win.loadFile('index.html');
}

app.whenReady().then(() => {
    // 【変更】ダイアログの表示を待つために `async` を付けます
    ipcMain.on('save-memo', async (event, text) => {
        
        // 【追加】「名前を付けて保存」ダイアログを表示
        const { canceled, filePath } = await dialog.showSaveDialog({
            title: 'メモを保存',
            defaultPath: 'memo.txt', // 最初から入力されているファイル名
            filters: [
                { name: 'テキストファイル', extensions: ['txt'] },
                { name: 'すべてのファイル', extensions: ['*'] }
            ]
        });

        // 【追加】ユーザーが「キャンセル」を押した場合はここで処理を終了
        if (canceled) {
            console.log('保存がキャンセルされました。');
            return;
        }

        // 【変更】ユーザーが指定した filePath に書き込む
        try {
            fs.writeFileSync(filePath, text, 'utf-8');
            console.log(`📝 ${filePath} に保存完了しました！`);
        } catch (error) {
            console.error('エラーが発生しました:', error);
        }

    });

    createWindow();

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