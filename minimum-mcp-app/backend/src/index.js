const express = require('express');
const cors = require('cors');
const chatRoute = require('./routes/chat');

const app = express();
const PORT = 3000;

// ミドルウェア設定
app.use(cors());
app.use(express.json()); // JSONのボディパースを有効化

// ルーティング
app.use('/api/chat', chatRoute);

// サーバー起動
app.listen(PORT, () => {
    console.log(`Backend server is running on http://localhost:${PORT}`);
});