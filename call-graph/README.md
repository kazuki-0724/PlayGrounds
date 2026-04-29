# Source Network

Javaコード断片を含むMarkdownからコールグラフを抽出し、Web UIで可視化するモノレポ構成のプロジェクトです。

## 概要

このプロジェクトは、以下の流れで解析を行います。

1. Markdownを入力（テキスト貼り付け or ファイルアップロード）
2. Javaコードブロックを抽出
3. Tree-sitterでASTを解析
4. クラス/メソッドノードと呼び出しエッジを生成
5. Cytoscapeでグラフ表示

## 現在の実装範囲（MVP初期）

- 単一リポジトリ構成（frontend / backend / shared）
- Markdown解析（### パス + javaコードブロック）
- Tree-sitter Javaによる構文解析
- ノード抽出（class, method）
- エッジ抽出（method_invocation）
- 曖昧呼び出しの複数候補エッジ化（confidence付き）
- 解析メタ情報返却（処理時間、警告件数など）
- UI可視化（ズーム、パン、ノード選択）
- ノード領域の分離レイアウト（メソッド帯: 上部、クラス帯: 下部固定）
- クリックハイライト（直接近傍を強調、非関連をフェード）
- ノード選択時の近傍再レイアウトアニメーション
- 選択ノードの赤ハイライト（ラベル背景は白・非透過）
- クラス選択時: 所属メソッドを黄色ハイライト
- メソッド選択時: 所属クラスを黄色ハイライト
- メソッド名/クラス名検索

## UI操作

- ノードをクリックすると、直接つながるノード/エッジを強調表示します。
- 強調時に近傍ノードをアニメーションで再配置し、重なりを緩和します。
- クラス選択時は同一クラス配下のメソッド群を黄色で可視化します。
- メソッド選択時はそのメソッドが属するクラスを黄色で可視化します。
- 背景クリックで選択状態と強調表示を解除します。
- 右上の詳細パネルは長いsourceパスを自動で折り返して表示します。

## リポジトリ構成

- frontend: Vue + Vite + Cytoscape の可視化UI
- backend: Express + Tree-sitter の解析API
- shared: API契約と型定義

## 入力フォーマット

Markdown内で、以下のペアを繰り返す形式を想定しています。

- 見出し: ### ファイルパス
- Javaコードブロック: java指定のフェンス

例:

~~~markdown
### src/main/java/com/example/App.java
```java
class App {
  void run() { helper(); }
  void helper() {}
}
```
~~~

注意:

- 見出しがないコードブロックは警告対象になります
- javaブロックが閉じていない場合も警告対象になります

## API

### GET /health

- 目的: ヘルスチェック
- レスポンス例:

~~~json
{ "ok": true }
~~~

### POST /api/analyze

- 目的: Markdown解析
- リクエスト:

~~~json
{ "markdown": "..." }
~~~

- レスポンス（概略）:

~~~json
{
  "nodes": [
    {
      "id": "method:...",
      "kind": "method",
      "label": "run",
      "fqcn": "App.run",
      "signature": "run()",
      "filePath": "src/main/java/com/example/App.java",
      "line": 2
    }
  ],
  "edges": [
    {
      "id": "edge:1",
      "from": "method:...",
      "to": "method:...",
      "kind": "calls",
      "confidence": 1,
      "reason": "resolved"
    }
  ],
  "warnings": [],
  "meta": {
    "elapsedMs": 12.34,
    "fragmentCount": 1,
    "warningCount": 0,
    "ambiguousEdgeCount": 0
  }
}
~~~

## セットアップ

前提:

- Node.js 18以上推奨
- npm

インストール:

~~~powershell
npm.cmd install
~~~

Windows PowerShellで実行ポリシーにより npm がブロックされる場合、npm.cmd を利用してください。

## 開発起動

~~~powershell
npm.cmd run dev
~~~

起動先:

- frontend: http://localhost:5173
- backend: http://localhost:8787

## ビルド

~~~powershell
npm.cmd run build
~~~

## 型チェック

~~~powershell
npm.cmd run lint
~~~

## テスト

~~~powershell
npm.cmd run test
~~~

現時点ではテスト雛形のみで、今後Unit/Integration/E2Eを拡充予定です。

## 主な技術

- TypeScript
- Vue 3
- Vite
- Cytoscape.js
- Express
- Tree-sitter
- Zod
- Vitest

## 既知の注意点

- frontendの本番ビルドでチャンクサイズ警告が出る場合があります
- 大規模グラフ向け最適化（段階描画、WebWorkerなど）は今後のフェーズで対応予定です
- レイアウトは可読性重視でクラス帯を固定しているため、グラフ構造によってはエッジが長くなる場合があります

## 次フェーズ候補

- 解析ロジックのUnitテスト強化
- API契約テスト追加
- E2E（アップロード→描画→ハイライト→検索）追加
- パフォーマンス計測と上限ガードレール定義

## サンプル

- 現実寄りの30ファイル依存サンプル（Retailドメイン）: [examples/chaos-30-files.md](examples/chaos-30-files.md)

## 関連ファイル

- [package.json](package.json)
- [backend/src/server.ts](backend/src/server.ts)
- [backend/src/analysis/markdownSplitter.ts](backend/src/analysis/markdownSplitter.ts)
- [backend/src/analysis/javaAnalyzer.ts](backend/src/analysis/javaAnalyzer.ts)
- [frontend/src/App.vue](frontend/src/App.vue)
- [shared/src/types.ts](shared/src/types.ts)
