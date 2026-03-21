const PendingImageModal = ({ image, onClose, onRestore }) => {
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // ファイル名が異なる場合の警告
    if (file.name !== image.name) {
      if (!window.confirm(`選択されたファイル名が元の名前と異なります。

・期待されるファイル名: ${image.name}
・選択されたファイル名: ${file.name}

このファイルを使用して復元を強行しますか？`)) {
        e.target.value = '';
        return;
      }
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      onRestore(image.id, file.name, ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
      <div className="bg-white p-6 rounded shadow-lg max-w-md w-full">
        <h3 className="text-lg font-bold mb-4 flex items-center text-indigo-800">
          <span className="material-icons mr-2">cloud_sync</span>待機中画像の復元
        </h3>
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-1">復元対象のファイル名:</p>
          <div className="bg-gray-100 p-3 rounded text-sm font-mono break-all border border-gray-200 text-gray-800">
            {image.name}
          </div>
        </div>
        <p className="mb-6 text-xs text-gray-500">
          上記と同じファイル名の画像をアップロードすると、保存されているマークアップ情報が復元されます。
        </p>
        <div className="mb-6">
          <input 
            type="file" 
            accept="image/*" 
            onChange={handleFileChange} 
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
          />
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border rounded hover:bg-gray-100 text-sm font-bold transition-colors">キャンセル</button>
        </div>
      </div>
    </div>
  );
};

export default PendingImageModal;
