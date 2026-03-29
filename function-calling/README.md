# function-calling

Gemini API と MCP (Model Context Protocol) を組み合わせた、Function Calling デモアプリです。

- フロントエンド: Vue 3 + Vite
- API サーバー: Express
- ツール実行: MCP クライアント (`server.js`) + MCP サーバー (`mcp-server.js`)

## 概要

ユーザーの入力を `/api/chat` に送信し、Gemini が必要に応じて MCP ツールを呼び出します。
このプロジェクトでは、社員情報取得と、レシピ -> 商品情報取得のデモツールを提供しています。

## ディレクトリ構成

```text
function-calling/
├─ .env
├─ index.html                # Vite エントリ
├─ package.json
├─ server.js                 # Express + Gemini + MCPクライアント
├─ mcp-server.js             # MCPサーバー（ツール定義/実行）
├─ vite.config.js
├─ src/
│  ├─ main.js
│  ├─ App.vue
│  ├─ assets/
│  │  └─ styles.css
│  ├─ components/
│  │  ├─ AppHeader.vue
│  │  ├─ ChatMessageList.vue
│  │  └─ ChatInputBar.vue
│  └─ services/
│     └─ chatApi.js          # フロントのAPI呼び出しを集約
└─ public/                   # ビルド成果物のみ（npm run build で生成）
```

## アーキテクチャ

1. フロント (`src/App.vue`) が `postChat` (`src/services/chatApi.js`) を呼ぶ
2. Express (`server.js`) の `/api/chat` がリクエスト受信
3. `server.js` が MCP クライアント経由で利用可能ツールを取得
4. Gemini にツール定義を渡して `sendMessage`
5. Gemini が function call を返したら MCP ツールを実行
6. ツール結果を Gemini に返して最終回答を生成
7. フロントへ `{ text }` を返却

## MCP ツール

`mcp-server.js` で以下のツールを提供しています。

- `get_employee_info`
  - 社員IDから社員情報を取得
- `get_recipe_by_keyword`
  - キーワードからレシピ情報と必要具材情報を取得
- `get_item_info_by_id`
  - 商品IDから商品詳細を取得

## セットアップ

### 1) 依存インストール

```bash
npm install
```

### 2) 環境変数設定

ルートに `.env` を作成し、Gemini APIキーを設定します。

```env
GEMINI_API_KEY=your_api_key_here
```

### 3) フロントをビルド

```bash
npm run build
```

> `public/` はビルド成果物置き場です。手編集したファイルは次回ビルドで上書き/削除されます。

### 4) サーバー起動

```bash
npm start
```

起動後: `http://localhost:3000`

## 開発時のコマンド

- `npm run dev`: Vite 開発サーバー起動
- `npm run build`: 本番向けビルド (`public/` 出力)
- `npm run preview`: ビルド結果のプレビュー
- `npm start`: Express サーバー起動

## よくあるトラブル

### 1) `503 Service Unavailable` (high demand)

Gemini 側の一時的高負荷です。時間を空けて再試行してください。

### 2) `Unknown tool`

Gemini が要求したツール名と `mcp-server.js` の定義名が不一致の場合に発生します。
`server.js` のログで要求ツール名を確認し、`mcp-server.js` の `tools` と揃えてください。

### 3) 画面が更新されない

`src/` を変更した場合、`npm run build` を実行して `public/` へ反映してください。
`npm start` は `public/` を配信します。

## 補足

- API呼び出しは `src/services/chatApi.js` に集約しています。
- `server.js` はリトライ処理、ツール呼び出しループ制御、未知ツール防御を持っています。
