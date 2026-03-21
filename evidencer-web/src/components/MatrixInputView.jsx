import { useState } from 'react';
import MatrixCard from './MatrixCard';
import ImportModal from './ImportModal';

const MatrixInputView = ({ matrices, updateMatrix, removeMatrix, addMatrix, addImportedMatrices, onCreate }) => {
  const [showImportModal, setShowImportModal] = useState(false);

  return (
    <div className="space-y-6">
      {matrices.map((m) => (
        <MatrixCard key={m.id} matrix={m} updateMatrix={updateMatrix} removeMatrix={removeMatrix} />
      ))}
      <div className="flex justify-between items-center mt-8 pt-4 border-t border-gray-300">
        <div className="flex gap-4">
          <button onClick={addMatrix} className="text-indigo-600 font-bold uppercase flex items-center hover:bg-indigo-50 px-4 py-2 rounded transition-colors">
            <span className="material-icons mr-1">add</span>マトリクスを追加
          </button>
          <button onClick={() => setShowImportModal(true)} className="text-gray-600 font-bold uppercase flex items-center hover:bg-gray-100 px-4 py-2 rounded transition-colors">
            <span className="material-icons mr-1">upload_file</span>インポート
          </button>
        </div>
        <button onClick={onCreate} className="bg-indigo-600 text-white font-bold uppercase shadow-lg px-8 py-3 rounded hover:bg-indigo-700 flex items-center transition-colors">
          <span className="material-icons mr-2">play_arrow</span>証跡を作成する
        </button>
      </div>

      {showImportModal && (
        <ImportModal onClose={() => setShowImportModal(false)} onImport={(data) => { addImportedMatrices(data); setShowImportModal(false); }} />
      )}
    </div>
  );
};

export default MatrixInputView;
