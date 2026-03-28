import { useState } from 'react';
import { generateId } from '../utils/idGenerator';
import ImageMarkupModal from './ImageMarkupModal';
import PendingImageModal from './PendingImageModal';

const PatternCard = ({ pattern, patternIndex, matrix, setMatrices }) => {
  const [editingImage, setEditingImage] = useState(null);
  const [selectedPendingImage, setSelectedPendingImage] = useState(null);

  const updatePatternValue = (type, key, val) => {
    setMatrices(prev => prev.map(m => {
      if (m.id !== matrix.id) return m;
      return {
        ...m,
        patterns: m.patterns.map(p => {
          if (p.id !== pattern.id) return p;
          if (type === 'condition') return { ...p, conditionValues: { ...p.conditionValues, [key]: val } };
          if (type === 'result') return { ...p, resultValues: { ...p.resultValues, [key]: val } };
          if (type === 'note') return { ...p, note: val };
          return p;
        })
      };
    }));
  };

  const toggleSkip = () => {
    setMatrices(prev => prev.map(m => {
      if (m.id !== matrix.id) return m;
      return {
        ...m,
        patterns: m.patterns.map(p => {
          if (p.id !== pattern.id) return p;
          return { ...p, isSkipped: !p.isSkipped };
        })
      };
    }));
  };

  const saveEditedImage = (newData) => {
    setMatrices(prev => prev.map(m => {
      if (m.id !== matrix.id) return m;
      return {
        ...m,
        patterns: m.patterns.map(p => {
          if (p.id !== pattern.id) return p;
          return {
            ...p,
            images: p.images.map(img => img.id === editingImage.id ? { ...img, dataUrl: newData.dataUrl, drawDataUrl: newData.drawDataUrl } : img)
          };
        })
      };
    }));
    setEditingImage(null);
  };

  // 待機中画像の強制復元処理
  const handleRestorePendingImage = (imgId, uploadedFileName, uploadedDataUrl) => {
    setMatrices(prev => prev.map(m => {
      if (m.id !== matrix.id) return m;
      return {
        ...m,
        patterns: m.patterns.map(p => {
          if (p.id !== pattern.id) return p;
          
          const updatedImages = [...p.images];
          const targetIdx = updatedImages.findIndex(img => img.id === imgId);
          
          if (targetIdx !== -1) {
            const targetImg = updatedImages[targetIdx];
            // ファイル名が異なっていても強行された場合は新しい名前で上書きする
            updatedImages[targetIdx] = { 
              ...targetImg, 
              name: uploadedFileName, 
              originalDataUrl: uploadedDataUrl, 
              dataUrl: uploadedDataUrl 
            };

            // 描画データがある場合は非同期で合成して上書き更新する
            if (targetImg.drawDataUrl) {
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              const bgImg = new Image();
              bgImg.onload = () => {
                canvas.width = bgImg.width;
                canvas.height = bgImg.height;
                ctx.drawImage(bgImg, 0, 0);
                const fgImg = new Image();
                fgImg.onload = () => {
                  ctx.drawImage(fgImg, 0, 0);
                  const mergedDataUrl = canvas.toDataURL('image/png');
                  // 非同期での状態更新
                  setMatrices(latest => latest.map(lm => m.id !== lm.id ? lm : {
                    ...lm, patterns: lm.patterns.map(lp => p.id !== lp.id ? lp : {
                      ...lp, images: lp.images.map(limg => limg.id !== imgId ? limg : { ...limg, dataUrl: mergedDataUrl })
                    })
                  }));
                };
                fgImg.src = targetImg.drawDataUrl;
              };
              bgImg.src = uploadedDataUrl;
            }
          }
          return { ...p, images: updatedImages };
        })
      };
    }));
    setSelectedPendingImage(null);
  };

  // 画像アップロード処理 (通常の一括追加・同名復元)
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const uploadedFiles = await Promise.all(files.map(file => {
      return new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = ev => resolve({ name: file.name, dataUrl: ev.target.result });
        reader.readAsDataURL(file);
      });
    }));

    setMatrices(prev => {
      return prev.map(m => {
        if (m.id !== matrix.id) return m;
        return {
          ...m,
          patterns: m.patterns.map(p => {
            if (p.id !== pattern.id) return p;
            
            let updatedImages = [...p.images];
            const newImagesToAdd = [];
            
            uploadedFiles.forEach(uf => {
              const targetIdx = updatedImages.findIndex(img => img.name === uf.name && !img.originalDataUrl);
              if (targetIdx !== -1) {
                const targetImg = updatedImages[targetIdx];
                updatedImages[targetIdx] = { ...targetImg, originalDataUrl: uf.dataUrl, dataUrl: uf.dataUrl };
                
                if (targetImg.drawDataUrl) {
                  const canvas = document.createElement('canvas');
                  const ctx = canvas.getContext('2d');
                  const bgImg = new Image();
                  bgImg.onload = () => {
                    canvas.width = bgImg.width;
                    canvas.height = bgImg.height;
                    ctx.drawImage(bgImg, 0, 0);
                    const fgImg = new Image();
                    fgImg.onload = () => {
                      ctx.drawImage(fgImg, 0, 0);
                      const mergedDataUrl = canvas.toDataURL('image/png');
                      setMatrices(latest => latest.map(lm => m.id !== lm.id ? lm : {
                        ...lm, patterns: lm.patterns.map(lp => p.id !== lp.id ? lp : {
                          ...lp, images: lp.images.map(limg => limg.id !== targetImg.id ? limg : { ...limg, dataUrl: mergedDataUrl })
                        })
                      }));
                    };
                    fgImg.src = targetImg.drawDataUrl;
                  };
                  bgImg.src = uf.dataUrl;
                }
              } else {
                newImagesToAdd.push({
                  id: generateId(),
                  name: uf.name,
                  originalDataUrl: uf.dataUrl,
                  dataUrl: uf.dataUrl,
                  drawDataUrl: null
                });
              }
            });

            return { ...p, images: [...updatedImages, ...newImagesToAdd] };
          })
        };
      });
    });
    
    e.target.value = '';
  };

  const removeImage = (imgId) => {
    setMatrices(prev => prev.map(m => {
      if (m.id !== matrix.id) return m;
      return {
        ...m,
        patterns: m.patterns.map(p => {
          if (p.id !== pattern.id) return p;
          return { ...p, images: p.images.filter(img => img.id !== imgId) };
        })
      };
    }));
  };

  return (
    <div className={`bg-white border ${pattern.isSkipped ? 'border-gray-300 bg-gray-50 opacity-75' : 'border-gray-200'} rounded-lg p-5 shadow-sm flex flex-col md:flex-row gap-6 hover:border-indigo-300 transition-all relative`}>
      {pattern.isSkipped && (
        <div className="absolute inset-0 bg-gray-200 opacity-20 pointer-events-none rounded-lg z-20"></div>
      )}
      
      <div className="md:w-1/2 space-y-4 relative z-30">
        <div className="flex justify-between items-center border-b pb-2">
          <h3 className="font-bold text-gray-800 flex items-center">
            <span className={`text-xs px-2 py-1 rounded mr-2 ${pattern.isSkipped ? 'bg-gray-300 text-gray-600' : 'bg-indigo-100 text-indigo-800'}`}>PTN {patternIndex + 1}</span>
          </h3>
          <label className="flex items-center cursor-pointer hover:bg-gray-100 px-2 py-1 rounded text-sm text-gray-600 font-bold transition-colors">
            <input type="checkbox" className="mr-2 cursor-pointer w-4 h-4 accent-gray-500" checked={pattern.isSkipped || false} onChange={toggleSkip} />
            実施不要にする
          </label>
        </div>
        
        <div className="bg-gray-50 p-3 rounded border border-gray-100">
          <p className="text-xs font-bold text-gray-500 mb-2 flex items-center"><span className="material-icons text-[14px] mr-1">rule</span>条件</p>
          <ul className="text-sm space-y-2">
            {Object.entries(pattern.conditionValues).map(([k, v]) => (
              <li key={k} className="flex items-center">
                <span className="font-bold text-gray-700 w-24 shrink-0 truncate" title={k}>{k}:</span>
                <input type="text" className="flex-1 bg-white border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors w-full disabled:bg-gray-100" value={v} onChange={(e) => updatePatternValue('condition', k, e.target.value)} disabled={pattern.isSkipped} />
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-gray-50 p-3 rounded border border-gray-100">
          <p className="text-xs font-bold text-gray-500 mb-2 flex items-center"><span className="material-icons text-[14px] mr-1">done_all</span>結果</p>
          <ul className="text-sm space-y-2">
            {matrix.results.filter(r => r.name.trim()).length > 0 ? (
              matrix.results.filter(r => r.name.trim()).map(r => {
                const k = r.name;
                const v = pattern.resultValues[k] || '';
                const candidates = r.values.map(val => val.value.trim()).filter(Boolean);
                
                return (
                  <li key={r.id} className="flex items-center">
                    <span className="font-bold text-gray-700 w-24 shrink-0 truncate" title={k}>{k}:</span>
                    {candidates.length > 0 ? (
                      <select className="flex-1 bg-white border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors w-full disabled:bg-gray-100" value={v} onChange={(e) => updatePatternValue('result', k, e.target.value)} disabled={pattern.isSkipped}>
                        <option value="">-- 選択してください --</option>
                        {candidates.map((c, i) => <option key={i} value={c}>{c}</option>)}
                      </select>
                    ) : (
                      <input type="text" className="flex-1 bg-white border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors w-full disabled:bg-gray-100" value={v} onChange={(e) => updatePatternValue('result', k, e.target.value)} disabled={pattern.isSkipped} placeholder="結果候補が未設定（直接入力）" />
                    )}
                  </li>
                );
              })
            ) : (
              <li className="text-gray-500 italic text-xs">結果項目の設定がありません</li>
            )}
          </ul>
        </div>

        <div className="bg-gray-50 p-3 rounded border border-gray-100">
          <p className="text-xs font-bold text-gray-500 mb-2 flex items-center"><span className="material-icons text-[14px] mr-1">notes</span>備考</p>
          <textarea className="w-full bg-white border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors text-sm disabled:bg-gray-100 resize-y" rows="2" value={pattern.note || ''} onChange={(e) => updatePatternValue('note', null, e.target.value)} disabled={pattern.isSkipped} placeholder="備考を入力" ></textarea>
        </div>
      </div>

      <div className="md:w-1/2 md:border-l md:border-gray-200 md:pl-6 flex flex-col relative z-30">
        <div className="flex justify-between items-center mb-3">
          <p className="text-xs font-bold text-gray-500 flex items-center">
            <span className="material-icons text-[14px] mr-1">image</span>証跡画像
          </p>
          <label className={`cursor-pointer bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-3 py-1.5 rounded text-xs font-bold flex items-center transition-colors border border-indigo-200 shadow-sm ${pattern.isSkipped ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <span className="material-icons text-[16px] mr-1">add_photo_alternate</span>
            画像を追加
            <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileUpload} disabled={pattern.isSkipped} />
          </label>
        </div>
        
        <div className="flex-1 bg-gray-50 border border-dashed border-gray-300 rounded p-3 overflow-y-auto max-h-64 flex flex-wrap gap-3 content-start relative">
          {pattern.images.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
              <span className="material-icons text-4xl mb-2 opacity-50">photo_library</span>
              <p className="text-xs font-medium">画像がアップロードされていません</p>
            </div>
          )}
          {pattern.images.map(img => (
            <div key={img.id} className="relative group w-[100px] h-[100px] border border-gray-200 rounded shadow-sm overflow-hidden bg-white z-10 flex-shrink-0">
              {img.originalDataUrl ? (
                <img 
                  src={img.dataUrl} 
                  alt={img.name} 
                  className={`w-full h-full object-cover ${pattern.isSkipped ? '' : 'cursor-pointer hover:opacity-75'} transition-opacity`}
                  onClick={() => !pattern.isSkipped && setEditingImage(img)}
                  title={pattern.isSkipped ? "" : "クリックしてマークアップ"}
                />
              ) : (
                <div 
                  className={`w-full h-full flex flex-col items-center justify-center bg-gray-100 text-gray-500 p-2 text-center ${pattern.isSkipped ? '' : 'cursor-pointer hover:bg-gray-200'} transition-colors`}
                  onClick={() => !pattern.isSkipped && setSelectedPendingImage(img)}
                  title={pattern.isSkipped ? "" : "クリックしてファイル名を確認・画像を復元"}
                >
                  <span className="material-icons text-2xl mb-1 opacity-40">cloud_upload</span>
                  <span className="text-[9px] leading-tight break-all font-bold text-gray-400">待機中</span>
                </div>
              )}
              
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-[10px] truncate px-1 py-0.5 pointer-events-none">
                {img.name}
              </div>
              {!pattern.isSkipped && (
                <button 
                  onClick={() => removeImage(img.id)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow"
                  title="削除"
                >
                  <span className="material-icons text-[14px] block">close</span>
                </button>
              )}
            </div>
          ))}
        </div>
        
        {pattern.images.some(img => !img.originalDataUrl) && !pattern.isSkipped && (
          <p className="text-[10px] text-red-500 mt-2 font-bold animate-pulse flex items-center">
            <span className="material-icons text-[12px] mr-1">info</span>
            ※「待機中」の画像があります。枠をクリックするか画像を再追加すると復元されます。
          </p>
        )}
      </div>

      {editingImage && (
        <ImageMarkupModal image={editingImage} onClose={() => setEditingImage(null)} onSave={saveEditedImage} />
      )}

      {selectedPendingImage && (
        <PendingImageModal image={selectedPendingImage} onClose={() => setSelectedPendingImage(null)} onRestore={handleRestorePendingImage} />
      )}
    </div>
  );
};

export default PatternCard;
