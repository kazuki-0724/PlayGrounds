const ConfirmModal = ({ onCancel, onConfirm }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow-lg max-w-sm">
        <h3 className="text-lg font-bold mb-4 flex items-center text-yellow-600">
          <span className="material-icons mr-2">warning</span>確認
        </h3>
        <p className="mb-6 text-sm text-gray-700">
          既にアップロードされた証跡画像が存在します。構成を変更して再作成すると、条件に合致しなくなったPTNの画像データは失われる可能性があります。<br/><br/>作成を実行しますか？
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 border rounded hover:bg-gray-100 text-sm font-bold transition-colors">キャンセル</button>
          <button onClick={onConfirm} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm font-bold transition-colors">作成を実行する</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
