const saveBtn = document.getElementById('saveBtn');
const memoInput = document.getElementById('memoInput');

saveBtn.addEventListener('click', () => {
    const text = memoInput.value;
    console.log('画面側のボタンが押されました！入力値:', text);
    // プリロードスクリプト経由でメインプロセスにテキストを送信
    window.electronAPI.sendMemo(text);
});