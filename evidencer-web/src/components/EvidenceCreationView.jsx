import PatternCard from './PatternCard';

const EvidenceCreationView = ({ matrices, setMatrices }) => {
  const activeMatrices = matrices.filter(m => m.patterns && m.patterns.length > 0);

  if (activeMatrices.length === 0) {
    return (
      <div className="text-center text-gray-500 mt-20">
        <span className="material-icons text-6xl text-gray-300">receipt_long</span>
        <p className="mt-4 font-bold text-lg">PTNが生成されていません</p>
        <p className="text-sm mt-2">「テストマトリクス入力」タブで定義を行い、<br/>「証跡を作成する」ボタンを押してください。</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {activeMatrices.map(matrix => (
        <div key={matrix.id} className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
          <div className="bg-indigo-50 px-6 py-4 border-b border-indigo-100 flex items-center">
            <span className="material-icons text-indigo-400 mr-2">folder</span>
            <h2 className="text-lg font-bold text-indigo-900">{matrix.name || '名称未設定マトリクス'}</h2>
          </div>
          <div className="p-6 bg-gray-50">
            <div className="grid grid-cols-1 gap-6">
              {matrix.patterns.map((pattern, pIdx) => (
                <PatternCard 
                  key={pattern.id} 
                  pattern={pattern} 
                  patternIndex={pIdx}
                  matrix={matrix} 
                  setMatrices={setMatrices} 
                />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default EvidenceCreationView;
