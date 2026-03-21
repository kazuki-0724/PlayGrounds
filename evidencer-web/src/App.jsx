import { useState, useEffect, useRef } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

import Header from './components/Header';
import MatrixInputView from './components/MatrixInputView';
import EvidenceCreationView from './components/EvidenceCreationView';
import ConfirmModal from './components/ConfirmModal';
import ScrollToTopFAB from './components/ScrollToTopFAB';

import { generateId } from './utils/idGenerator';
import { saveToDB, loadFromDB, clearDB } from './utils/indexedDB';
import { STORAGE_KEY, TAB_STORAGE_KEY } from './constants';

// デフォルトのマトリクス状態
const defaultMatrixState = () => [{
  id: generateId(),
  name: '',
  conditions: [{ id: generateId(), name: '', values: [{ id: generateId(), value: '' }] }],
  results: [{ id: generateId(), name: '', values: [{ id: generateId(), value: '' }] }],
  patterns: []
}];

const App = () => {
  // タブ状態の復元
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem(TAB_STORAGE_KEY) || 'matrix';
  });

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const isInitialMount = useRef(true);

  // マトリクス状態の復元
  const [matrices, setMatrices] = useState(defaultMatrixState());
  const [isLoaded, setIsLoaded] = useState(false);

  // 初期データの読み込み (IndexedDB)
  useEffect(() => {
    const loadData = async () => {
      try {
        const savedData = await loadFromDB();
        if (savedData) {
          setMatrices(savedData);
        } else {
          // 旧バージョン (localStorage) からのマイグレーション
          const oldSaved = localStorage.getItem(STORAGE_KEY);
          if (oldSaved) {
            const parsed = JSON.parse(oldSaved);
            setMatrices(parsed);
            await saveToDB(parsed);
            localStorage.removeItem(STORAGE_KEY);
          }
        }
      } catch (e) {
        console.error("セーブデータの読み込みに失敗しました", e);
      } finally {
        setIsLoaded(true);
      }
    };
    loadData();
  }, []);

  // --- オートセーブ機能 ---
  useEffect(() => {
    localStorage.setItem(TAB_STORAGE_KEY, activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (!isLoaded) return;
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return; // 初回マウント時はセーブを走らせない
    }

    // 画像の巨大データ（originalDataUrl, dataUrl）を除外して保存
    const dataToSave = matrices.map(m => ({
      ...m,
      patterns: m.patterns.map(p => ({
        ...p,
        images: p.images.map(img => ({
          id: img.id,
          name: img.name,
          drawDataUrl: img.drawDataUrl || null
          // base64画像データは保存しない
        }))
      }))
    }));

    saveToDB(dataToSave)
      .then(() => {
        setSaveStatus('自動保存しました');
        setTimeout(() => setSaveStatus(''), 2000);
      })
      .catch((e) => {
        console.error("オートセーブエラー", e);
        setSaveStatus('保存失敗');
      });
  }, [matrices, isLoaded]);

  // マトリクスの追加・更新・削除
  const addMatrix = () => {
    setMatrices([...matrices, ...defaultMatrixState()]);
  };
  
  const updateMatrix = (id, field, value) => {
    setMatrices(matrices.map(m => m.id === id ? { ...m, [field]: value } : m));
  };
  
  const removeMatrix = (id) => {
    setMatrices(matrices.filter(m => m.id !== id));
  };

  // 全データクリア処理
  const handleClearAllData = async () => {
    if (window.confirm("保存されているすべてのデータを削除して初期化しますか？\n（この操作は元に戻せません）")) {
      await clearDB();
      localStorage.removeItem(TAB_STORAGE_KEY);
      setMatrices(defaultMatrixState());
      setActiveTab('matrix');
    }
  };

  // マトリクスのインポート処理（既存のマトリクスをクリアして置き換え）
  const addImportedMatrices = (importedData) => {
    const newMatrices = importedData.map(m => ({
      id: generateId(),
      name: m.name || '',
      conditions: (m.conditions || []).map(c => ({
        id: generateId(),
        name: c.name || '',
        values: (c.values && c.values.length > 0 ? c.values : [{ value: '' }]).map(v => ({ id: generateId(), value: v.value || '' }))
      })),
      results: (m.results || []).map(r => ({
        id: generateId(),
        name: r.name || '',
        values: (r.values && r.values.length > 0 ? r.values : [{ value: '' }]).map(v => ({ id: generateId(), value: v.value || '' }))
      })),
      patterns: []
    }));
    setMatrices(newMatrices);
  };

  // 現在のマトリクス定義をJSONでエクスポートする処理
  const handleExportJson = () => {
    const exportData = matrices.map(m => ({
      name: m.name,
      conditions: m.conditions.map(c => ({
        name: c.name,
        values: c.values.map(v => ({ value: v.value }))
      })),
      results: m.results.map(r => ({
        name: r.name,
        values: r.values.map(v => ({ value: v.value }))
      }))
    }));
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "matrices_template.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 実際の証跡作成（パターン自動生成処理）
  const executeCreateEvidence = () => {
    const newMatrices = matrices.map(m => {
      // 有効な条件項目のみ抽出
      const validConditions = m.conditions.filter(c => c.name.trim() && c.values.some(v => v.value.trim()));
      
      if (validConditions.length === 0) return { ...m, patterns: [] };

      // 各条件の値の配列を作成
      const conditionArrays = validConditions.map(c => 
        c.values.map(v => v.value.trim()).filter(Boolean).map(v => ({ type: 'condition', name: c.name, value: v }))
      );

      // 直積（組み合わせ）の計算
      const calcCartesian = (arrs) => arrs.length > 0 ? arrs.reduce((acc, curr) => {
        const res = [];
        acc.forEach(a => curr.forEach(b => res.push([...a, b])));
        return res;
      }, [[]]) : [];

      const combinations = calcCartesian(conditionArrays);

      // パターン情報の生成
      const newPatterns = combinations.map((combo, index) => {
        const conditionValues = {};
        combo.forEach(item => {
          if (item.type === 'condition') conditionValues[item.name] = item.value;
        });

        // 既存パターンとのマッチング
        const existing = m.patterns.find(ep => 
          Object.keys(conditionValues).every(k => ep.conditionValues[k] === conditionValues[k]) &&
          Object.keys(ep.conditionValues).length === Object.keys(conditionValues).length
        );

        // 結果入力値は既存のものを引き継ぐか、新規項目の場合は空文字
        const resultValues = existing ? { ...existing.resultValues } : {};
        m.results.forEach(r => {
          if (r.name.trim() && !resultValues.hasOwnProperty(r.name)) {
            resultValues[r.name] = '';
          }
        });

        return {
          id: existing ? existing.id : generateId(),
          conditionValues: existing ? { ...existing.conditionValues } : conditionValues,
          resultValues: resultValues,
          note: existing ? existing.note || '' : '',
          images: existing ? existing.images : [],
          isSkipped: existing ? existing.isSkipped : false
        };
      });

      return { ...m, patterns: newPatterns };
    });

    setMatrices(newMatrices);
    setActiveTab('evidence');
    window.scrollTo(0, 0);
  };

  // 「作成」ボタン押下時の処理（確認モーダルの制御）
  const handleCreateEvidence = () => {
    const hasData = matrices.some(m => m.patterns && m.patterns.some(p => p.images && p.images.length > 0));
    if (hasData) {
      setShowConfirmModal(true);
    } else {
      executeCreateEvidence();
    }
  };

  // マークダウンと画像の一括ダウンロード (ZIP)
  const handleExport = async () => {
    const zip = new JSZip();
    const assetsFolder = zip.folder("assets");
    let mdContent = "# テスト証跡\n\n";
    let hasWarning = false;

    matrices.forEach((m, mIdx) => {
      if (m.patterns.length === 0) return;
      mdContent += `## ${m.name || 'マトリクス ' + (mIdx + 1)}\n\n`;

      m.patterns.forEach((p, pIdx) => {
        mdContent += `### PTN ${pIdx + 1}\n`;
        
        if (p.isSkipped) {
          mdContent += `**【実施不要】**\n\n`;
        }

        mdContent += `**[条件]**\n`;
        Object.entries(p.conditionValues).forEach(([k, v]) => {
          mdContent += `- ${k}: ${v}\n`;
        });
        mdContent += `\n`;

        mdContent += `**[結果]**\n`;
        Object.entries(p.resultValues).forEach(([k, v]) => {
          mdContent += `- ${k}: ${v || '未入力'}\n`;
        });
        mdContent += `\n`;

        if (p.note) {
          mdContent += `**[備考]**\n${p.note}\n\n`;
        }

        if (p.images.length > 0 && !p.isSkipped) {
          // originalDataUrlが存在するもの（復元済み・アップロード済みのもの）のみ出力対象とする
          const validImages = p.images.filter(img => img.originalDataUrl);
          
          if (validImages.length < p.images.length) {
            hasWarning = true;
          }

          if (validImages.length > 0) {
            mdContent += `**[証跡画像]**\n`;
            validImages.forEach((img, iIdx) => {
              const fileName = img.name; 
              mdContent += `<img src="./assets/${fileName}" alt="証跡" style="max-height: 500px;" />\n`;
              const base64Data = img.dataUrl.split(',')[1];
              assetsFolder.file(fileName, base64Data, {base64: true});
            });
            mdContent += `\n`;
          }
        }
        mdContent += `---\n\n`;
      });
    });

    if (hasWarning) {
      alert("【警告】再アップロード待ち状態（待機中）の画像が含まれています。待機中の画像は出力ファイルに含まれません。");
    }

    zip.file("evidence.md", mdContent);

    try {
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, "evidence_export.zip");
    } catch (e) {
      console.error("出力に失敗しました: " + e.message);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        saveStatus={saveStatus}
        onClearAllData={handleClearAllData}
        onExportJson={handleExportJson}
        onExport={handleExport}
      />

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-5xl mx-auto pb-20">
          {!isLoaded ? (
            <div className="text-center text-gray-500 mt-20">
              <span className="material-icons animate-pulse text-4xl text-indigo-400">sync</span>
              <p className="mt-4 font-bold text-lg">データを読み込んでいます...</p>
            </div>
          ) : activeTab === 'matrix' ? (
            <MatrixInputView 
              matrices={matrices} 
              updateMatrix={updateMatrix} 
              removeMatrix={removeMatrix} 
              addMatrix={addMatrix}
              addImportedMatrices={addImportedMatrices}
              onCreate={handleCreateEvidence}
            />
          ) : (
            <EvidenceCreationView 
              matrices={matrices} 
              setMatrices={setMatrices} 
            />
          )}
        </div>
      </main>

      {/* 証跡再作成時の確認モーダル */}
      {showConfirmModal && (
        <ConfirmModal
          onCancel={() => setShowConfirmModal(false)}
          onConfirm={() => { setShowConfirmModal(false); executeCreateEvidence(); }}
        />
      )}

      {/* 証跡作成プレビュー時のみ表示する上部へ戻るFAB */}
      {activeTab === 'evidence' && <ScrollToTopFAB />}
    </div>
  );
};

export default App;
