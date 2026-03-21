const Header = ({ activeTab, setActiveTab, saveStatus, onClearAllData, onExportJson, onExport }) => {
  return (
    <header className="bg-indigo-600 text-white shadow-md z-10">
      <div className="px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold flex items-center">
          <span className="material-icons mr-2">fact_check</span>
          証跡作成アプリ
        </h1>
        <div className="flex items-center gap-4">
          {saveStatus && (
            <span className="text-xs bg-indigo-500 px-2 py-1 rounded text-indigo-50 animate-pulse flex items-center">
              <span className="material-icons text-[14px] mr-1">cloud_done</span>{saveStatus}
            </span>
          )}
          <button 
            onClick={onClearAllData}
            className="text-indigo-200 hover:text-white text-xs underline px-2 py-1 transition-colors"
            title="保存されているすべてのデータを初期化します"
          >
            全データクリア
          </button>

          {activeTab === 'matrix' && (
            <button 
              onClick={onExportJson}
              className="bg-indigo-500 text-white border border-indigo-400 px-4 py-2 rounded shadow hover:bg-indigo-400 flex items-center text-sm font-bold transition-colors"
            >
              <span className="material-icons mr-2 text-[18px]">download</span>
              マトリクス保存(JSON)
            </button>
          )}
          {activeTab === 'evidence' && (
            <button 
              onClick={onExport}
              className="bg-white text-indigo-600 px-4 py-2 rounded shadow hover:bg-gray-100 flex items-center text-sm font-bold transition-colors"
            >
              <span className="material-icons mr-2 text-[18px]">download</span>
              マークダウン出力
            </button>
          )}
        </div>
      </div>
      {/* Tabs */}
      <div className="flex px-6 space-x-6">
        <button 
          className={`py-3 uppercase text-sm font-bold border-b-4 transition-colors ${activeTab === 'matrix' ? 'border-white text-white' : 'border-transparent text-indigo-200 hover:text-white'}`}
          onClick={() => setActiveTab('matrix')}
        >
          テストマトリクス入力
        </button>
        <button 
          className={`py-3 uppercase text-sm font-bold border-b-4 transition-colors ${activeTab === 'evidence' ? 'border-white text-white' : 'border-transparent text-indigo-200 hover:text-white'}`}
          onClick={() => setActiveTab('evidence')}
        >
          証跡作成プレビュー
        </button>
      </div>
    </header>
  );
};

export default Header;
