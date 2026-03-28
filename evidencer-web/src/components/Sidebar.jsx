import { useState, useEffect } from 'react';

const Sidebar = ({
  isOpen,
  datasets,
  activeDatasetId,
  onSwitchDataset,
  onCreateNewDataset,
  onRenameDataset,
  onDeleteDataset,
}) => {
  return (
    <aside 
      className={`absolute top-0 left-0 h-full z-20 w-64 bg-white bg-opacity-70 backdrop-blur-xl p-4 flex flex-col border-r border-gray-200/50 shrink-0 transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <h2 className="text-lg font-bold mb-2 text-gray-800">証跡データ一覧</h2>
      
      <div className="flex gap-2 mb-4">
        <button 
          onClick={onCreateNewDataset} 
          className="flex-1 text-sm bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-3 rounded flex items-center justify-center"
        >
          <span className="material-icons text-base mr-1">add</span>
          新規作成
        </button>
        <button 
          onClick={onDeleteDataset} 
          className="flex-1 text-sm bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-3 rounded flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={datasets.length <= 1}
        >
          <span className="material-icons text-base mr-1">delete</span>
          削除
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 border-t border-gray-200 pt-2">
        <ul>
          {datasets.map(dataset => (
            <li key={dataset.id} className="mb-2">
              <button
                onClick={() => onSwitchDataset(dataset.id)}
                className={`w-full text-left p-2 rounded text-sm font-bold flex justify-between items-center group ${
                  dataset.id === activeDatasetId
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="truncate">{dataset.name}</span>
                <span 
                  onClick={(e) => { e.stopPropagation(); onRenameDataset(dataset.id, dataset.name); }}
                  className={`material-icons text-sm ml-2 ${
                    dataset.id === activeDatasetId ? 'text-indigo-200' : 'text-gray-400 opacity-0 group-hover:opacity-100'
                  }`}
                >
                  edit
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
};

export default Sidebar;
