const { useState, useEffect, useRef } = React;

// --- Tauri API の準備 ---
const { fs, path, tauri } = window.__TAURI__;
const { getCurrent } = window.__TAURI__.window;
const invoke = window.__TAURI__.invoke || window.__TAURI__.tauri.invoke;

const generateId = () => Math.random().toString(36).substring(2, 9);
const STATUS_MAP = {
  'untested': { label: '未実施', color: 'bg-gray-200 text-gray-700' },
  'ok': { label: 'OK', color: 'bg-green-500 text-white' },
  'ng': { label: 'NG', color: 'bg-red-500 text-white' },
  'pending': { label: '保留', color: 'bg-yellow-500 text-white' },
  'skipped': { label: '実施不要', color: 'bg-gray-400 text-white' }
};

const defaultMatrixState = () => [{
  id: generateId(), name: '',
  conditions: [{ id: generateId(), name: '', values: [{ id: generateId(), value: '' }] }],
  results: [{ id: generateId(), name: '', values: [{ id: generateId(), value: '' }] }],
  patterns: []
}];

/* =======================================
   カスタムタイトルバー
======================================= */
const TitleBar = ({ workspace, onSelectWorkspace, onRevealWorkspace }) => {
  return (
    <div className="h-8 select-none flex justify-between items-center bg-gray-900 text-gray-300 text-[13px] shadow-sm z-50 fixed top-0 left-0 w-full font-sans">
      <div className="flex items-center h-full flex-1">
        <div data-tauri-drag-region className="flex items-center h-full px-2 cursor-default">
          <span className="material-icons text-[16px] mr-2 text-indigo-400 pointer-events-none">fact_check</span>
          <span className="font-bold pointer-events-none mr-4">Evidence Creator</span>
        </div>
        <div className="flex h-full items-center">
          <div className="relative group h-full flex items-center px-3 hover:bg-gray-700 cursor-pointer transition-colors">
            ファイル
            <div className="absolute left-0 top-8 bg-gray-800 border border-gray-700 shadow-lg rounded-b w-48 hidden group-hover:block py-1 text-gray-200 cursor-default">
              <div onClick={onSelectWorkspace} className="px-4 py-2 hover:bg-gray-700 cursor-pointer flex items-center">
                <span className="material-icons text-[16px] mr-2">folder_open</span>ワークスペースを開く...
              </div>
              <div onClick={onRevealWorkspace} className={`px-4 py-2 flex items-center ${workspace ? 'hover:bg-gray-700 cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}>
                <span className="material-icons text-[16px] mr-2">open_in_new</span>ワークスペースを展開
              </div>
            </div>
          </div>
        </div>
        {/* ドラッグ用余白スペース */}
        <div data-tauri-drag-region className="flex-1 h-full"></div>
      </div>
      <div className="flex h-full">
        <div onClick={() => getCurrent().minimize()} className="flex items-center justify-center w-11 h-full hover:bg-gray-700 cursor-pointer transition-colors" title="最小化">
          <span className="material-icons text-[16px] pointer-events-none">remove</span>
        </div>
        <div onClick={() => getCurrent().toggleMaximize()} className="flex items-center justify-center w-11 h-full hover:bg-gray-700 cursor-pointer transition-colors" title="最大化">
          <span className="material-icons text-[16px] pointer-events-none">crop_square</span>
        </div>
        <div onClick={() => getCurrent().close()} className="flex items-center justify-center w-11 h-full hover:bg-red-600 hover:text-white cursor-pointer transition-colors" title="閉じる">
          <span className="material-icons text-[16px] pointer-events-none">close</span>
        </div>
      </div>
    </div>
  );
};

/* =======================================
   メインアプリケーション
======================================= */
const App = () => {
  const [activeTab, setActiveTab] = useState('matrix');
  const [workspace, setWorkspace] = useState(localStorage.getItem('tauri_workspace') || null);
  const [matrices, setMatrices] = useState(defaultMatrixState());
  const [isLoading, setIsLoading] = useState(false);

  // オートセーブ
  useEffect(() => {
    const saveData = async () => {
      if (workspace) {
        try {
          const dataFile = await path.join(workspace, 'evidence_data.json');
          const minifiedMatrices = matrices.map(m => ({
            ...m, patterns: m.patterns.map(p => ({
              ...p, images: p.images.map(img => ({ id: img.id, name: img.name, absolutePath: img.absolutePath }))
            }))
          }));
          await fs.writeTextFile(dataFile, JSON.stringify(minifiedMatrices, null, 2));
        } catch (e) { console.error("Workspace save error:", e); }
      }
    };
    const timer = setTimeout(saveData, 1000);
    return () => clearTimeout(timer);
  }, [matrices, workspace]);

  // ワークスペース選択
  const handleSelectWorkspace = async () => {
    try {
      // Rust コマンド経由で OS のフォルダ選択ダイアログを開く
      const selectedPath = await invoke('select_workspace_folder');
      if (!selectedPath) return;
      if (typeof selectedPath !== 'string') {
        throw new Error('選択したフォルダパスを取得できませんでした。');
      }

      // 存在チェック
      let existsWorkspace = true;
      try {
        existsWorkspace = await fs.exists(selectedPath);
      } catch (_) {
        existsWorkspace = true;
      }
      if (!existsWorkspace) {
        throw new Error(`指定したパスが存在しません: ${selectedPath}`);
      }

      setWorkspace(selectedPath);
      localStorage.setItem('tauri_workspace', selectedPath);

      const assetsDir = await path.join(selectedPath, 'assets');
      let existsAssetsDir = false;
      try {
        existsAssetsDir = await fs.exists(assetsDir);
      } catch (_) {
        existsAssetsDir = false;
      }

      if (!existsAssetsDir) {
        try {
          await fs.createDir(assetsDir, { recursive: true });
        } catch (_) {
          await fs.createDir(assetsDir);
        }
      }
    } catch (e) {
      console.error('handleSelectWorkspace error:', e);
      alert("フォルダの選択に失敗しました: " + (e?.message || e));
    }
  };

  // 初期ロード時のディレクトリ選択
  useEffect(() => {
    if (!workspace) {
      handleSelectWorkspace();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRevealWorkspace = async () => {
    if (workspace) {
      try {
        await invoke('reveal_workspace_folder', { path: workspace });
      } catch (e) {
        console.error('Failed to open workspace:', e);
        alert(`ワークスペースの展開に失敗しました: ${e}`);
      }
    } else {
      alert('ワークスペースが選択されていません。');
    }
  };

  // ワークスペース変更時のデータ読み込み
  useEffect(() => {
    const loadData = async () => {
      if (workspace) {
        try {
          const dataFile = await path.join(workspace, 'evidence_data.json');
          if (await fs.exists(dataFile)) {
            const text = await fs.readTextFile(dataFile);
            setMatrices(JSON.parse(text));
          }
        } catch (e) { console.error("Workspace load error:", e); }
      }
    };
    loadData();
  }, [workspace]);

  // Tauriローカルファイル保存ロジック
  const saveFileToWorkspace = async (file, prefix) => {
    if (!workspace) throw new Error('先にワークスペースを選択してください。');
    const arrayBuffer = await file.arrayBuffer();
    const assetsDir = await path.join(workspace, 'assets');
    let existsAssetsDir = false;
    try {
      existsAssetsDir = await fs.exists(assetsDir);
    } catch (_) {
      existsAssetsDir = false;
    }
    if (!existsAssetsDir) {
      try {
        await fs.createDir(assetsDir, { recursive: true });
      } catch (_) {
        await fs.createDir(assetsDir);
      }
    }
    
    const ext = file.name.split('.').pop() || 'png';
    const fileName = `${prefix}_${generateId()}.${ext}`;
    const absolutePath = await path.join(assetsDir, fileName);
    
    const binary = new Uint8Array(arrayBuffer);
    try {
      // 新しめの書式
      await fs.writeBinaryFile({ path: absolutePath, contents: binary });
    } catch (_) {
      // 旧書式
      await fs.writeBinaryFile(absolutePath, binary);
    }
    return { fileName, absolutePath };
  };

  const executeCreateEvidence = () => {
    const newMatrices = matrices.map(m => {
      const validConditions = m.conditions.filter(c => c.name.trim() && c.values.some(v => v.value.trim()));
      if (validConditions.length === 0) return { ...m, patterns: [] };

      const conditionArrays = validConditions.map(c => 
        c.values.map(v => v.value.trim()).filter(Boolean).map(v => ({ name: c.name, value: v }))
      );

      const calcCartesian = (arrs) => arrs.length > 0 ? arrs.reduce((acc, curr) => {
        const res = [];
        acc.forEach(a => curr.forEach(b => res.push([...a, b])));
        return res;
      }, [[]]) : [];

      const combinations = calcCartesian(conditionArrays);

      const newPatterns = combinations.map((combo) => {
        const conditionValues = {};
        combo.forEach(item => conditionValues[item.name] = item.value);

        const existing = m.patterns.find(ep => 
          Object.keys(conditionValues).every(k => ep.conditionValues[k] === conditionValues[k]) &&
          Object.keys(ep.conditionValues).length === Object.keys(conditionValues).length
        );

        const resultValues = existing ? { ...existing.resultValues } : {};
        m.results.forEach(r => { if (r.name.trim() && !resultValues.hasOwnProperty(r.name)) resultValues[r.name] = ''; });

        return {
          id: existing ? existing.id : generateId(),
          conditionValues,
          resultValues,
          note: existing ? existing.note || '' : '',
          status: existing ? existing.status || 'untested' : 'untested',
          images: existing ? existing.images : []
        };
      });

      return { ...m, patterns: newPatterns };
    });

    setMatrices(newMatrices);
    setActiveTab('evidence');
    window.scrollTo(0, 0);
  };

  // MD出力
  const handleExport = async () => {
    let mdContent = "# テスト証跡\n\n";

    matrices.forEach((m, mIdx) => {
      if (m.patterns.length === 0) return;
      mdContent += `## ${m.name || 'マトリクス ' + (mIdx + 1)}\n\n`;

      m.patterns.forEach((p, pIdx) => {
        mdContent += `### PTN ${pIdx + 1} [${STATUS_MAP[p.status].label}]\n`;
        if (p.status === 'skipped') mdContent += `**【実施不要】**\n\n`;

        mdContent += `**[条件]**\n`;
        Object.entries(p.conditionValues).forEach(([k, v]) => mdContent += `- ${k}: ${v}\n`);
        mdContent += `\n**[結果]**\n`;
        Object.entries(p.resultValues).forEach(([k, v]) => mdContent += `- ${k}: ${v || '未入力'}\n`);
        mdContent += `\n`;

        if (p.note) mdContent += `**[備考]**\n${p.note}\n\n`;

        if (p.images.length > 0 && p.status !== 'skipped') {
          mdContent += `**[証跡画像]**\n`;
          p.images.forEach((img) => {
            mdContent += `<img src="./assets/${img.fileName || img.name}" alt="証跡" style="max-height: 500px;" />\n`;
          });
          mdContent += `\n`;
        }
        mdContent += `---\n\n`;
      });
    });

    if (workspace) {
      try {
        await fs.writeTextFile(await path.join(workspace, "evidence.md"), mdContent);
        alert("ワークスペースに evidence.md を出力しました！");
      } catch (e) { alert("出力エラー: " + e); }
    }
  };

  return (
    <div className="min-h-screen flex flex-col pt-8">
      <TitleBar workspace={workspace} onSelectWorkspace={handleSelectWorkspace} onRevealWorkspace={handleRevealWorkspace} />
      <header className="bg-indigo-800 text-white shadow-md z-10 sticky top-8">
        <div className="px-6 py-3 flex justify-between items-center border-b border-indigo-700">
          <h1 className="text-lg font-bold flex items-center">
            <span className="material-icons mr-2">fact_check</span>証跡作成アプリ
          </h1>
          <div className="flex items-center gap-4">
            {activeTab === 'evidence' && (
              <button onClick={handleExport} className="bg-white text-indigo-800 px-4 py-1.5 rounded shadow hover:bg-gray-100 flex items-center text-sm font-bold transition-colors">
                <span className="material-icons mr-1 text-[18px]">download</span>MD出力
              </button>
            )}
          </div>
        </div>
        <div className="flex px-6 space-x-6 bg-indigo-700">
          <button className={`py-3 uppercase text-sm font-bold border-b-4 transition-colors ${activeTab === 'matrix' ? 'border-white text-white' : 'border-transparent text-indigo-300 hover:text-white'}`} onClick={() => setActiveTab('matrix')}>
            テストマトリクス入力
          </button>
          <button className={`py-3 uppercase text-sm font-bold border-b-4 transition-colors ${activeTab === 'evidence' ? 'border-white text-white' : 'border-transparent text-indigo-300 hover:text-white'}`} onClick={() => setActiveTab('evidence')}>
            証跡作成プレビュー
          </button>
        </div>
      </header>

      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-6xl mx-auto pb-20">
          {activeTab === 'matrix' ? (
            <MatrixInputView matrices={matrices} setMatrices={setMatrices} onCreate={executeCreateEvidence} />
          ) : (
            <EvidenceCreationView matrices={matrices} setMatrices={setMatrices} saveFileToWorkspace={saveFileToWorkspace} />
          )}
        </div>
      </main>
    </div>
  );
};

/* =======================================
   マトリクス入力画面
======================================= */
const MatrixInputView = ({ matrices, setMatrices, onCreate }) => {
  const updateMatrix = (id, field, value) => setMatrices(matrices.map(m => m.id === id ? { ...m, [field]: value } : m));
  const removeMatrix = (id) => setMatrices(matrices.filter(m => m.id !== id));
  const addMatrix = () => setMatrices([...matrices, defaultMatrixState()[0]]);

  return (
    <div className="space-y-6">
      {matrices.map((m) => (
        <MatrixCard key={m.id} matrix={m} updateMatrix={updateMatrix} removeMatrix={removeMatrix} />
      ))}
      <div className="flex justify-between items-center mt-8 pt-4 border-t border-gray-300">
        <button onClick={addMatrix} className="text-indigo-600 font-bold uppercase flex items-center hover:bg-indigo-50 px-4 py-2 rounded transition-colors">
          <span className="material-icons mr-1">add</span>マトリクスを追加
        </button>
        <button onClick={onCreate} className="bg-indigo-600 text-white font-bold uppercase shadow-lg px-8 py-3 rounded hover:bg-indigo-700 flex items-center transition-colors">
          <span className="material-icons mr-2">play_arrow</span>証跡を作成する
        </button>
      </div>
    </div>
  );
};

const MatrixCard = ({ matrix, updateMatrix, removeMatrix }) => {
  const updateList = (listName, id, field, value) => updateMatrix(matrix.id, listName, matrix[listName].map(item => item.id === id ? { ...item, [field]: value } : item));
  const addListItem = (listName) => updateMatrix(matrix.id, listName, [...matrix[listName], { id: generateId(), name: '', values: [{ id: generateId(), value: '' }] }]);
  const removeListItem = (listName, id) => updateMatrix(matrix.id, listName, matrix[listName].filter(item => item.id !== id));

  const updateValue = (listName, itemId, valueId, newValue) => updateMatrix(matrix.id, listName, matrix[listName].map(item => item.id === itemId ? { ...item, values: item.values.map(v => v.id === valueId ? { ...v, value: newValue } : v) } : item));
  const addValue = (listName, itemId) => updateMatrix(matrix.id, listName, matrix[listName].map(item => item.id === itemId ? { ...item, values: [...item.values, { id: generateId(), value: '' }] } : item));
  const removeValue = (listName, itemId, valueId) => updateMatrix(matrix.id, listName, matrix[listName].map(item => item.id === itemId ? { ...item, values: item.values.filter(v => v.id !== valueId) } : item));

  return (
    <div className="bg-white rounded-lg shadow p-6 relative border border-gray-200">
      <button onClick={() => removeMatrix(matrix.id)} className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors" title="削除">
        <span className="material-icons">delete_outline</span>
      </button>
      <div className="mb-6 w-full md:w-1/2">
        <label className="md-label">マトリクス名</label>
        <input type="text" className="md-input w-full font-bold text-lg text-gray-800" value={matrix.name} onChange={(e) => updateMatrix(matrix.id, 'name', e.target.value)} placeholder="例：ログイン機能テスト" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-blue-50/50 p-4 rounded border border-blue-100">
          <h3 className="font-bold text-blue-800 mb-4 flex items-center text-sm"><span className="material-icons text-blue-500 mr-1 text-[18px]">rule</span>条件項目</h3>
          {matrix.conditions.map((c) => (
            <div key={c.id} className="mb-4 bg-white p-3 rounded shadow-sm relative border border-gray-100">
              <button onClick={() => removeListItem('conditions', c.id)} className="absolute top-2 right-2 text-gray-400 hover:text-red-500"><span className="material-icons text-sm">close</span></button>
              <input type="text" className="md-input w-[90%] text-sm font-bold text-gray-800 mb-3" value={c.name} onChange={e => updateList('conditions', c.id, 'name', e.target.value)} placeholder="項目名 (例: OS)" />
              <div className="flex flex-col gap-2">
                {c.values.map((v) => (
                  <div key={v.id} className="flex items-center bg-gray-50 border border-gray-300 rounded px-2 py-1 w-full">
                    <input type="text" className="bg-transparent border-none outline-none text-sm w-full py-1" value={v.value} onChange={e => updateValue('conditions', c.id, v.id, e.target.value)} placeholder="値" />
                    <button onClick={() => removeValue('conditions', c.id, v.id)} className="text-gray-400 hover:text-red-500"><span className="material-icons text-[16px]">close</span></button>
                  </div>
                ))}
                <button onClick={() => addValue('conditions', c.id)} className="text-xs text-blue-600 flex items-center justify-center border border-dashed border-blue-300 py-1 rounded hover:bg-blue-50"><span className="material-icons text-[14px] mr-1">add</span>値を追加</button>
              </div>
            </div>
          ))}
          <button onClick={() => addListItem('conditions')} className="text-sm text-blue-600 font-bold flex items-center mt-2 hover:underline"><span className="material-icons text-[16px] mr-1">add</span>条件項目を追加</button>
        </div>
        <div className="bg-green-50/50 p-4 rounded border border-green-100">
          <h3 className="font-bold text-green-800 mb-4 flex items-center text-sm"><span className="material-icons text-green-500 mr-1 text-[18px]">done_all</span>結果項目</h3>
          {matrix.results.map((r) => (
            <div key={r.id} className="mb-4 bg-white p-3 rounded shadow-sm relative border border-gray-100">
              <button onClick={() => removeListItem('results', r.id)} className="absolute top-2 right-2 text-gray-400 hover:text-red-500"><span className="material-icons text-sm">close</span></button>
              <input type="text" className="md-input w-[90%] text-sm font-bold text-gray-800 mb-3" value={r.name} onChange={e => updateList('results', r.id, 'name', e.target.value)} placeholder="項目名 (例: メッセージ)" />
              <div className="flex flex-col gap-2">
                {r.values.map((v) => (
                  <div key={v.id} className="flex items-center bg-gray-50 border border-gray-300 rounded px-2 py-1 w-full">
                    <input type="text" className="bg-transparent border-none outline-none text-sm w-full py-1" value={v.value} onChange={e => updateValue('results', r.id, v.id, e.target.value)} placeholder="候補値 (任意)" />
                    <button onClick={() => removeValue('results', r.id, v.id)} className="text-gray-400 hover:text-red-500"><span className="material-icons text-[16px]">close</span></button>
                  </div>
                ))}
                <button onClick={() => addValue('results', r.id)} className="text-xs text-green-600 flex items-center justify-center border border-dashed border-green-300 py-1 rounded hover:bg-green-50"><span className="material-icons text-[14px] mr-1">add</span>候補を追加</button>
              </div>
            </div>
          ))}
          <button onClick={() => addListItem('results')} className="text-sm text-green-600 font-bold flex items-center mt-2 hover:underline"><span className="material-icons text-[16px] mr-1">add</span>結果項目を追加</button>
        </div>
      </div>
    </div>
  );
};

/* =======================================
   証跡プレビュー画面
======================================= */
const EvidenceCreationView = ({ matrices, setMatrices, saveFileToWorkspace }) => {
  const [markupImage, setMarkupImage] = useState(null);
  const activeMatrices = matrices.filter(m => m.patterns && m.patterns.length > 0);
  
  const saveMarkup = async (image, arrayBuffer) => {
    try {
      const binary = new Uint8Array(arrayBuffer);
      
      // Windows Webview2 の画像ファイルロック回避のため、別名ファイルとして保存する
      // パス区切りの問題や path.join のエラーを防ぐため、文字列置換で新パスを生成する
      const pathParts = image.absolutePath.split(/[\\/]/);
      const fileName = pathParts.pop();
      
      const ext = fileName.split('.').pop() || 'png';
      const baseName = fileName.substring(0, fileName.lastIndexOf('.'));
      // 何度も上書き保存した際にファイル名が長くなりすぎないよう、以前のサフィックスを除去
      const cleanBaseName = baseName.replace(/_m\d+$/, '');
      const newFileName = `${cleanBaseName}_m${Date.now()}.${ext}`;
      
      // 古いファイル名を新しいファイル名に置換して絶対パスを生成
      const newPath = image.absolutePath.replace(fileName, newFileName);

      try {
        await fs.writeBinaryFile({ path: newPath, contents: binary });
      } catch (_) {
        await fs.writeBinaryFile(newPath, binary);
      }

      // ファイルパスの参照を新しいものに更新し、キャッシュ回避用のタイムスタンプを設定
      setMatrices(prev => prev.map(m => ({
        ...m, patterns: m.patterns.map(p => ({
          ...p, images: p.images.map(img => img.id === image.id ? { ...img, absolutePath: newPath, name: newFileName, updated: Date.now() } : img)
        }))
      })));
      setMarkupImage(null);

      // 古いファイルの削除を試行（表示直後でロックされている場合は失敗するがアプリは停止させない）
      setTimeout(async () => {
        try {
          await fs.removeFile(image.absolutePath);
        } catch (e) {
          console.warn("古いファイルの削除をスキップしました (ファイルロックの可能性):", e);
        }
      }, 1000);
    } catch (e) {
      console.error('saveMarkup error:', e);
      alert("保存に失敗しました: " + (e?.message || JSON.stringify(e)));
    }
  };

  // 進捗計算
  const allPatterns = activeMatrices.flatMap(m => m.patterns);
  const total = allPatterns.length;
  if (total === 0) return <div className="text-center text-gray-500 mt-20">PTNが生成されていません</div>;

  const counts = {
    ok: allPatterns.filter(p => p.status === 'ok').length,
    ng: allPatterns.filter(p => p.status === 'ng').length,
    pending: allPatterns.filter(p => p.status === 'pending').length,
    skipped: allPatterns.filter(p => p.status === 'skipped').length,
    untested: allPatterns.filter(p => p.status === 'untested').length,
  };

  return (
    <div className="space-y-6">
      {/* プログレスバー */}
      <div className="bg-white p-4 rounded-lg shadow border border-gray-200 sticky top-[60px] z-20">
        <div className="flex justify-between text-sm font-bold text-gray-700 mb-2">
          <span>テスト進捗 ({total - counts.untested - counts.skipped} / {total - counts.skipped})</span>
          <span>完了率: {total - counts.skipped > 0 ? Math.round(((counts.ok + counts.ng) / (total - counts.skipped)) * 100) : 0}%</span>
        </div>
        <div className="h-4 w-full bg-gray-200 rounded-full overflow-hidden flex">
          <div style={{ width: `${(counts.ok / total) * 100}%` }} className="bg-green-500 transition-all duration-500" title={`OK: ${counts.ok}`}></div>
          <div style={{ width: `${(counts.ng / total) * 100}%` }} className="bg-red-500 transition-all duration-500" title={`NG: ${counts.ng}`}></div>
          <div style={{ width: `${(counts.pending / total) * 100}%` }} className="bg-yellow-500 transition-all duration-500" title={`保留: ${counts.pending}`}></div>
          <div style={{ width: `${(counts.skipped / total) * 100}%` }} className="bg-gray-400 transition-all duration-500" title={`実施不要: ${counts.skipped}`}></div>
        </div>
        <div className="flex gap-4 mt-3 text-xs justify-center flex-wrap">
          {Object.entries(STATUS_MAP).map(([key, info]) => (
            <span key={key} className="flex items-center"><span className={`w-3 h-3 rounded-full mr-1 ${info.color.split(' ')[0]}`}></span>{info.label}: {counts[key]}</span>
          ))}
        </div>
      </div>

      {activeMatrices.map(matrix => (
        <div key={matrix.id} className="bg-white rounded-lg shadow border border-gray-200">
          <div className="bg-indigo-50 px-6 py-3 border-b border-indigo-100"><h2 className="font-bold text-indigo-900">{matrix.name || '名称未設定'}</h2></div>
          <div className="p-5 bg-gray-50 space-y-5">
            {matrix.patterns.map((pattern, pIdx) => (
              <PatternCard 
                key={pattern.id} pattern={pattern} patternIndex={pIdx} matrix={matrix} 
                setMatrices={setMatrices} saveFileToWorkspace={saveFileToWorkspace}
                onOpenMarkup={setMarkupImage}
              />
            ))}
          </div>
        </div>
      ))}
      {markupImage && (
        <MarkupModal image={markupImage} onClose={() => setMarkupImage(null)} onSave={saveMarkup} />
      )}
    </div>
  );
};

const PatternCard = ({ pattern, patternIndex, matrix, setMatrices, saveFileToWorkspace, onOpenMarkup }) => {
  const [isDragging, setIsDragging] = useState(false);

  const updatePattern = (updates) => {
    setMatrices(prev => prev.map(m => m.id === matrix.id ? {
      ...m, patterns: m.patterns.map(p => p.id === pattern.id ? { ...p, ...updates } : p)
    } : m));
  };

  const updateResult = (k, v) => updatePattern({ resultValues: { ...pattern.resultValues, [k]: v } });

  const handleAddFiles = async (files) => {
    const targetFiles = files.filter((f) => f && f.type && f.type.startsWith('image/'));
    if (!targetFiles.length) return;
    const newImages = [];
    try {
      for (const file of targetFiles) {
        const saved = await saveFileToWorkspace(file, `m${matrix.id.substring(0,3)}_p${patternIndex+1}`);
        if (saved) newImages.push({ id: generateId(), name: saved.fileName, absolutePath: saved.absolutePath });
      }
    } catch (e) {
      alert(`画像の取り込みに失敗しました: ${e.message || e}`);
      return;
    }

    if (!newImages.length) {
      alert('画像を追加できませんでした。ワークスペースが未選択の場合は先に選択してください。');
      return;
    }

    updatePattern({ images: [...pattern.images, ...newImages] });
  };

  // D&D イベント
  const onDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);
  const onDrop = (e) => {
    e.preventDefault(); setIsDragging(false);
    if(pattern.status === 'skipped') return;
    handleAddFiles(Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/')));
  };

  // クリップボードペースト イベント
  const onPaste = (e) => {
    if(pattern.status === 'skipped') return;
    const items = e.clipboardData.items;
    const files = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) files.push(items[i].getAsFile());
    }
    handleAddFiles(files);
  };

  const getImageSrc = (img) => {
    if (img.absolutePath) return `${tauri.convertFileSrc(img.absolutePath)}?t=${img.updated || ''}`;
    return "";
  };

  const isSkipped = pattern.status === 'skipped';
  const statusColor = STATUS_MAP[pattern.status].color;

  return (
    <div 
      tabIndex={0} 
      onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop} onPaste={onPaste}
      className={`bg-white border-2 rounded-lg p-5 shadow-sm flex flex-col md:flex-row gap-5 transition-all outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 relative
        ${isSkipped ? 'border-gray-200 bg-gray-50 opacity-75' : isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-transparent hover:border-gray-300'}`}
    >
      {/* 左側：条件・結果・ステータス */}
      <div className="md:w-1/2 space-y-4">
        <div className="flex justify-between items-center border-b pb-2">
          <h3 className="font-bold flex items-center">
            <span className={`text-xs px-2 py-1 rounded mr-3 shadow-sm ${statusColor}`}>PTN {patternIndex + 1}</span>
          </h3>
          <select 
            className={`text-sm font-bold border border-gray-300 rounded px-2 py-1 shadow-sm focus:outline-none ${statusColor}`}
            value={pattern.status} onChange={(e) => updatePattern({ status: e.target.value })}
          >
            {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k} className="bg-white text-black">{v.label}</option>)}
          </select>
        </div>
        
        <div className="bg-gray-50 p-3 rounded border border-gray-100">
          <p className="text-xs font-bold text-gray-500 mb-2 flex items-center"><span className="material-icons text-[14px] mr-1">rule</span>条件</p>
          <ul className="text-sm space-y-1">
            {Object.entries(pattern.conditionValues).map(([k, v]) => (
              <li key={k} className="flex items-center"><span className="font-bold text-gray-700 w-24 shrink-0">{k}:</span><span className="text-gray-900">{v}</span></li>
            ))}
          </ul>
        </div>

        <div className="bg-gray-50 p-3 rounded border border-gray-100">
          <p className="text-xs font-bold text-gray-500 mb-2 flex items-center"><span className="material-icons text-[14px] mr-1">done_all</span>結果</p>
          <ul className="text-sm space-y-2">
            {matrix.results.filter(r => r.name.trim()).map(r => {
              const k = r.name; const v = pattern.resultValues[k] || '';
              const candidates = r.values.map(val => val.value.trim()).filter(Boolean);
              return (
                <li key={r.id} className="flex items-center">
                  <span className="font-bold text-gray-700 w-24 shrink-0 truncate">{k}:</span>
                  {candidates.length > 0 ? (
                    <select className="flex-1 bg-white border border-gray-300 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100" value={v} onChange={(e) => updateResult(k, e.target.value)} disabled={isSkipped}>
                      <option value="">-- 選択 --</option>
                      {candidates.map((c, i) => <option key={i} value={c}>{c}</option>)}
                    </select>
                  ) : (
                    <input type="text" className="flex-1 bg-white border border-gray-300 rounded px-2 py-1 text-sm disabled:bg-gray-100" value={v} onChange={(e) => updateResult(k, e.target.value)} disabled={isSkipped} placeholder="直接入力" />
                  )}
                </li>
              );
            })}
          </ul>
        </div>
        
        <textarea className="w-full bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm focus:bg-white focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100 resize-y" rows="2" value={pattern.note || ''} onChange={(e) => updatePattern({ note: e.target.value })} disabled={isSkipped} placeholder="備考を入力" ></textarea>
      </div>

      {/* 右側：画像領域 */}
      <div className="md:w-1/2 border-l border-gray-100 pl-5 flex flex-col">
        <div className="flex justify-between items-center mb-2">
          <p className="text-xs font-bold text-gray-500 flex items-center"><span className="material-icons text-[14px] mr-1">image</span>証跡画像</p>
          <label className={`cursor-pointer bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-3 py-1 rounded text-xs font-bold transition-colors border border-indigo-200 shadow-sm ${isSkipped ? 'opacity-50 pointer-events-none' : ''}`}>
            画像を選択
            <input
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                handleAddFiles(Array.from(e.target.files || []));
                // 同じファイルを連続選択しても change が発火するように初期化
                e.target.value = '';
              }}
              disabled={isSkipped}
            />
          </label>
        </div>
        
        <div className={`flex-1 bg-gray-50 border-2 border-dashed rounded p-3 overflow-y-auto max-h-64 flex flex-wrap gap-2 content-start relative ${isDragging ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300'}`}>
          {pattern.images.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 pointer-events-none">
              <span className="material-icons text-3xl mb-1 opacity-50">photo_library</span>
              <p className="text-xs font-bold">D&D もしくは (Ctrl+V)</p>
            </div>
          )}
          {pattern.images.map(img => (
            <div key={img.id} className="relative group w-24 h-24 border border-gray-200 rounded shadow-sm overflow-hidden bg-white">
              <img 
                src={getImageSrc(img)} 
                alt={img.name} 
                className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity" 
                onClick={() => onOpenMarkup && onOpenMarkup(img)}
                title="クリックしてマークアップ"
              />
              <div className="absolute bottom-0 left-0 w-full bg-black bg-opacity-60 text-white text-[9px] truncate px-1 py-0.5 pointer-events-none">{img.name}</div>
              {!isSkipped && (
                <button onClick={() => updatePattern({ images: pattern.images.filter(i => i.id !== img.id) })} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow"><span className="material-icons text-[12px] block">close</span></button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* =======================================
   画像マークアップ モーダル
======================================= */
const MarkupModal = ({ image, onClose, onSave }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [ctx, setCtx] = useState(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    const imgElement = new Image();
    imgElement.onload = () => {
      canvas.width = imgElement.width;
      canvas.height = imgElement.height;
      context.drawImage(imgElement, 0, 0);
      context.strokeStyle = 'red';
      context.lineWidth = 4;
      context.lineJoin = 'round';
      context.lineCap = 'round';
      setCtx(context);
    };
    imgElement.src = `${tauri.convertFileSrc(image.absolutePath)}?t=${image.updated || Date.now()}`;
  }, [image]);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e) => {
    if (!ctx) return;
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing || !ctx) return;
    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endDrawing = () => {
    if (!ctx) return;
    ctx.closePath();
    setIsDrawing(false);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    canvas.toBlob(async (blob) => {
      if (blob) {
        const arrayBuffer = await blob.arrayBuffer();
        await onSave(image, arrayBuffer);
      } else {
        alert("画像の生成に失敗しました。");
      }
    }, 'image/png');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex flex-col items-center justify-center z-50 p-4">
      <div className="bg-white p-4 rounded-lg shadow-xl w-full max-w-4xl flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center mb-4 shrink-0">
          <h2 className="text-lg font-bold">画像をマークアップ</h2>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 font-bold transition-colors">キャンセル</button>
            <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 font-bold transition-colors flex items-center">
              <span className="material-icons text-[18px] mr-1">save</span>上書き保存
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto bg-gray-100 border border-gray-300 rounded flex justify-center items-center p-2 relative">
           <canvas
             ref={canvasRef}
             onMouseDown={startDrawing}
             onMouseMove={draw}
             onMouseUp={endDrawing}
             onMouseOut={endDrawing}
             className="cursor-crosshair shadow max-w-full h-auto object-contain bg-white"
             style={{ display: 'block' }}
           ></canvas>
        </div>
      </div>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);