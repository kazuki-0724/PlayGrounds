import { generateId } from '../utils/idGenerator';

const MatrixCard = ({ matrix, updateMatrix, removeMatrix }) => {
  const updateList = (listName, id, field, value) => {
    const newList = matrix[listName].map(item => item.id === id ? { ...item, [field]: value } : item);
    updateMatrix(matrix.id, listName, newList);
  };
  const addListItem = (listName) => {
    updateMatrix(matrix.id, listName, [...matrix[listName], { id: generateId(), name: '', values: [{ id: generateId(), value: '' }] }]);
  };
  const removeListItem = (listName, id) => {
    updateMatrix(matrix.id, listName, matrix[listName].filter(item => item.id !== id));
  };

  const updateValue = (listName, itemId, valueId, newValue) => {
    const newList = matrix[listName].map(item => {
      if (item.id === itemId) return { ...item, values: item.values.map(v => v.id === valueId ? { ...v, value: newValue } : v) };
      return item;
    });
    updateMatrix(matrix.id, listName, newList);
  };

  const addValue = (listName, itemId) => {
    const newList = matrix[listName].map(item => {
      if (item.id === itemId) return { ...item, values: [...item.values, { id: generateId(), value: '' }] };
      return item;
    });
    updateMatrix(matrix.id, listName, newList);
  };

  const removeValue = (listName, itemId, valueId) => {
    const newList = matrix[listName].map(item => {
      if (item.id === itemId) return { ...item, values: item.values.filter(v => v.id !== valueId) };
      return item;
    });
    updateMatrix(matrix.id, listName, newList);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 relative">
      <button onClick={() => removeMatrix(matrix.id)} className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors" title="マトリクスを削除">
        <span className="material-icons">delete_outline</span>
      </button>
      
      <div className="mb-8 w-full md:w-1/2">
        <label className="md-label">マトリクス名</label>
        <input 
          type="text" 
          className="md-input w-full font-bold text-lg text-gray-800" 
          value={matrix.name} 
          onChange={(e) => updateMatrix(matrix.id, 'name', e.target.value)} 
          placeholder="例：基本機能テスト"
        />
      </div>

      <div className="flex flex-col gap-8">
        {/* 条件項目 */}
        <div className="bg-blue-50/50 p-4 rounded border border-blue-100">
          <h3 className="font-bold text-blue-800 mb-4 flex items-center text-sm">
            <span className="material-icons text-blue-500 mr-1 text-[18px]">rule</span>条件項目
          </h3>
          {matrix.conditions.map((c) => (
            <div key={c.id} className="mb-4 bg-white p-3 rounded shadow-sm relative border border-gray-100">
              <button onClick={() => removeListItem('conditions', c.id)} className="absolute top-2 right-2 text-gray-400 hover:text-red-500">
                <span className="material-icons text-sm">close</span>
              </button>
              <div className="mb-3 w-full pr-6">
                <label className="md-label">項目名</label>
                <input type="text" className="md-input w-full text-sm font-bold text-gray-800" value={c.name} onChange={e => updateList('conditions', c.id, 'name', e.target.value)} placeholder="例：OS" />
              </div>
              <div>
                <label className="md-label mb-2">条件値</label>
                <div className="flex flex-col gap-2">
                  {c.values.map((v) => (
                    <div key={v.id} className="flex items-center bg-white border border-gray-300 rounded px-2 py-1 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all w-full">
                      <input type="text" className="bg-transparent border-none outline-none text-sm w-full py-1" value={v.value} onChange={e => updateValue('conditions', c.id, v.id, e.target.value)} placeholder="値" />
                      <button onClick={() => removeValue('conditions', c.id, v.id)} className="text-gray-400 hover:text-red-500 ml-1 flex items-center justify-center">
                        <span className="material-icons text-[16px]">close</span>
                      </button>
                    </div>
                  ))}
                  <button onClick={() => addValue('conditions', c.id)} className="flex items-center justify-center w-full py-2 mt-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors border border-blue-200 border-dashed" title="値を追加">
                    <span className="material-icons text-sm mr-1">add</span> 値を追加
                  </button>
                </div>
              </div>
            </div>
          ))}
          <button onClick={() => addListItem('conditions')} className="text-sm text-blue-600 hover:underline flex items-center font-bold mt-2">
            <span className="material-icons text-[16px] mr-1">add</span> 条件項目を追加
          </button>
        </div>

        {/* 結果項目 */}
        <div className="bg-green-50/50 p-4 rounded border border-green-100">
          <h3 className="font-bold text-green-800 mb-4 flex items-center text-sm">
            <span className="material-icons text-green-500 mr-1 text-[18px]">done_all</span>結果項目
          </h3>
          {matrix.results.map((r) => (
            <div key={r.id} className="mb-4 bg-white p-3 rounded shadow-sm relative border border-gray-100">
              <button onClick={() => removeListItem('results', r.id)} className="absolute top-2 right-2 text-gray-400 hover:text-red-500">
                <span className="material-icons text-sm">close</span>
              </button>
              <div className="mb-3 w-full pr-6">
                <label className="md-label">項目名</label>
                <input type="text" className="md-input w-full text-sm font-bold text-gray-800" value={r.name} onChange={e => updateList('results', r.id, 'name', e.target.value)} placeholder="例：ボタン状態" />
              </div>
              <div>
                <label className="md-label mb-2">結果値候補</label>
                <div className="flex flex-col gap-2">
                  {r.values.map((v) => (
                    <div key={v.id} className="flex items-center bg-white border border-gray-300 rounded px-2 py-1 focus-within:border-green-500 focus-within:ring-1 focus-within:ring-green-500 transition-all w-full">
                      <input type="text" className="bg-transparent border-none outline-none text-sm w-full py-1" value={v.value} onChange={e => updateValue('results', r.id, v.id, e.target.value)} placeholder="値" />
                      <button onClick={() => removeValue('results', r.id, v.id)} className="text-gray-400 hover:text-red-500 ml-1 flex items-center justify-center">
                        <span className="material-icons text-[16px]">close</span>
                      </button>
                    </div>
                  ))}
                  <button onClick={() => addValue('results', r.id)} className="flex items-center justify-center w-full py-2 mt-1 rounded bg-green-50 text-green-600 hover:bg-green-100 transition-colors border border-green-200 border-dashed" title="値を追加">
                    <span className="material-icons text-sm mr-1">add</span> 値を追加
                  </button>
                </div>
              </div>
            </div>
          ))}
          <button onClick={() => addListItem('results')} className="text-sm text-green-600 hover:underline flex items-center font-bold mt-2">
            <span className="material-icons text-[16px] mr-1">add</span> 結果項目を追加
          </button>
        </div>
      </div>
    </div>
  );
};

export default MatrixCard;
