import { useState } from 'react';

const ImportModal = ({ onClose, onImport }) => {
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!Array.isArray(data)) throw new Error('JSONのルートは配列である必要があります。');
        onImport(data);
      } catch (err) {
        setError('ファイルの読み込みに失敗しました。正しいJSON形式か確認してください。');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
      <div className="bg-white p-6 rounded shadow-lg max-w-2xl w-full">
        <h3 className="text-lg font-bold mb-4 flex items-center text-indigo-800">
          <span className="material-icons mr-2">upload_file</span>マトリクスをインポート
        </h3>
        <p className="mb-2 text-sm text-gray-700">
          JSON形式のファイルを選択してインポートしてください。<br/>
          <strong className="text-red-500">※インポートを実行すると、現在作成中のマトリクスはクリアされます。</strong>
        </p>
        {error && <p className="text-red-500 text-sm mb-4 bg-red-50 p-2 rounded">{error}</p>}
        <div className="mb-6">
          <input 
            type="file" accept=".json" onChange={handleFileChange} 
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

export default ImportModal;
