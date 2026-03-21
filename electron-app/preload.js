const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // 'save-memo' というチャンネルでメインプロセスにデータを送る関数を定義
    sendMemo: (text) => ipcRenderer.send('save-memo', text)
});