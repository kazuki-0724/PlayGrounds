import { useState, useEffect, useRef } from 'react';

const ImageMarkupModal = ({ image, onClose, onSave }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState('pen'); // 'pen', 'rect', 'eraser'
  const [color, setColor] = useState('#ff0000');
  const [lineWidth, setLineWidth] = useState(3);
  
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [savedImageData, setSavedImageData] = useState(null);

  // オリジナル画像、なければ現在画像を背景レイヤーとして使用
  const baseImgSrc = image.originalDataUrl || image.dataUrl;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    const bgImg = new Image();
    bgImg.onload = () => {
      canvas.width = bgImg.width;
      canvas.height = bgImg.height;
      
      if (image.drawDataUrl) {
        const fgImg = new Image();
        fgImg.onload = () => ctx.drawImage(fgImg, 0, 0);
        fgImg.src = image.drawDataUrl;
      }
    };
    bgImg.src = baseImgSrc;
  }, [image, baseImgSrc]);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    let clientX = e.touches ? e.touches[0].clientX : e.clientX;
    let clientY = e.touches ? e.touches[0].clientY : e.clientY;

    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };

  const startDrawing = (e) => {
    const ctx = canvasRef.current.getContext('2d');
    const { x, y } = getCoordinates(e);
    setStartX(x);
    setStartY(y);
    setIsDrawing(true);

    if (tool === 'rect') {
      setSavedImageData(ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height));
    } else {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const ctx = canvasRef.current.getContext('2d');
    const { x, y } = getCoordinates(e);
    
    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
    
    if (tool === 'rect') {
      ctx.putImageData(savedImageData, 0, 0);
      ctx.beginPath();
      ctx.rect(startX, startY, x - startX, y - startY);
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    } else {
      ctx.lineTo(x, y);
      ctx.strokeStyle = tool === 'eraser' ? 'rgba(0,0,0,1)' : color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    }
  };

  const stopDrawing = () => setIsDrawing(false);

  const handleClearAll = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSave = () => {
    const fgCanvas = canvasRef.current;
    const drawDataUrl = fgCanvas.toDataURL('image/png');

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = fgCanvas.width;
    tempCanvas.height = fgCanvas.height;
    const tCtx = tempCanvas.getContext('2d');
    
    const bgImg = new Image();
    bgImg.onload = () => {
      tCtx.drawImage(bgImg, 0, 0);
      tCtx.drawImage(fgCanvas, 0, 0);
      onSave({ drawDataUrl, dataUrl: tempCanvas.toDataURL('image/png') });
    };
    bgImg.src = baseImgSrc;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const preventScroll = (e) => e.preventDefault();
    canvas.addEventListener('touchstart', preventScroll, { passive: false });
    canvas.addEventListener('touchmove', preventScroll, { passive: false });
    return () => {
      canvas.removeEventListener('touchstart', preventScroll);
      canvas.removeEventListener('touchmove', preventScroll);
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg flex flex-col w-full max-w-4xl max-h-full overflow-hidden shadow-2xl">
        <div className="p-3 border-b flex flex-wrap justify-between items-center bg-gray-50 gap-4">
          <h3 className="font-bold text-gray-800 flex items-center">
            <span className="material-icons mr-1 text-indigo-600">draw</span>画像マークアップ
          </h3>
          
          <div className="flex gap-4 items-center bg-white px-3 py-1 rounded shadow-sm border border-gray-200">
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded">
              <button onClick={() => setTool('pen')} className={`p-1 flex items-center justify-center rounded transition-colors ${tool === 'pen' ? 'bg-indigo-600 text-white shadow' : 'text-gray-600 hover:bg-gray-200'}`} title="ペン">
                <span className="material-icons text-[18px]">edit</span>
              </button>
              <button onClick={() => setTool('rect')} className={`p-1 flex items-center justify-center rounded transition-colors ${tool === 'rect' ? 'bg-indigo-600 text-white shadow' : 'text-gray-600 hover:bg-gray-200'}`} title="四角形">
                <span className="material-icons text-[18px]">crop_square</span>
              </button>
              <button onClick={() => setTool('eraser')} className={`p-1 flex items-center justify-center rounded transition-colors ${tool === 'eraser' ? 'bg-indigo-600 text-white shadow' : 'text-gray-600 hover:bg-gray-200'}`} title="消しゴム（描いた線を消す）">
                <svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 0 24 24" width="18" fill="currentColor">
                  <path d="M0 0h24v24H0V0z" fill="none"/>
                  <path d="M15.48 3.51c-.39-.39-1.02-.39-1.41 0l-9.56 9.56c-.39.39-.39 1.02 0 1.41l5.09 5.09c.39.39 1.02.39 1.41 0l9.56-9.56c.39-.39.39-1.02 0-1.41l-5.09-5.09zm1.41 5.09l-7.09 7.09-2.26-2.26 7.09-7.09 2.26 2.26z"/>
                  <path d="M19 19h-5v2h7v-2h-2z"/>
                </svg>
              </button>
            </div>
            
            <div className="h-6 w-px bg-gray-300"></div>
            
            <div className="flex items-center gap-1">
              <label className="text-xs text-gray-500 font-bold">色:</label>
              <input type="color" value={color} onChange={e => setColor(e.target.value)} disabled={tool === 'eraser'} className={`w-6 h-6 border-0 p-0 ${tool === 'eraser' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`} />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 font-bold">太さ: {lineWidth}</label>
              <input type="range" min="1" max="40" value={lineWidth} onChange={e => setLineWidth(e.target.value)} className="w-24" />
            </div>

            <div className="h-6 w-px bg-gray-300"></div>

            <button onClick={handleClearAll} className="p-1 flex items-center justify-center rounded text-red-600 hover:bg-red-100 transition-colors" title="すべての手書きデータを削除">
              <span className="material-icons text-[18px]">delete_sweep</span>
            </button>
          </div>

          <div className="flex gap-2">
            <button onClick={onClose} className="px-3 py-1.5 border rounded hover:bg-gray-100 text-sm font-bold transition-colors">キャンセル</button>
            <button onClick={handleSave} className="px-3 py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm font-bold flex items-center transition-colors">
              <span className="material-icons text-[16px] mr-1">save</span>保存
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto p-4 bg-gray-200 flex justify-center items-center">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseOut={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className={`shadow ${tool === 'eraser' ? 'cursor-cell' : 'cursor-crosshair'}`}
            style={{ 
              maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain',
              backgroundImage: `url(${baseImgSrc})`, backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat'
            }}
          ></canvas>
        </div>
        <div className="p-2 bg-gray-100 text-center text-xs text-gray-500">
          キャンバス上をドラッグしてマークアップできます
        </div>
      </div>
    </div>
  );
};

export default ImageMarkupModal;
