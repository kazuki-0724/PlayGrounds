const fs = require('fs');
const { marked, Renderer } = require('marked');

// Mermaidコードブロックを <div class="mermaid"> に変換するカスタムレンダラー
const renderer = new Renderer();
renderer.code = function ({ text, lang }) {
  if (lang === 'mermaid') {
    return `<div class="mermaid">\n${text}\n</div>\n`;
  }
  // それ以外は標準のコードブロック
  return `<pre><code class="language-${lang || ''}">${text}</code></pre>\n`;
};
marked.use({ renderer });

// 1. コマンドライン引数を受け取る (CSSの指定は不要になりました)
const mdPath = process.argv[2];
const outputPath = process.argv[3] || 'output.html';

if (!mdPath) {
  console.error('❌ エラー: 引数が足りません。');
  console.error('💡 使い方: node build.js <入力.md> [出力.html]');
  process.exit(1);
}

try {
  // 2. Markdownファイルの読み込み
  const mdContent = fs.readFileSync(mdPath, 'utf8');
  const bodyHtml = marked.parse(mdContent);

  // 3. github-markdown-css を node_modules から自動で読み込む
  const cssPath = require.resolve('github-markdown-css/github-markdown.css');
  const cssContent = fs.readFileSync(cssPath, 'utf8');

  // 4. HTMLの組み立て
  // ※ 公式の推奨に従い、bodyの余白と .markdown-body クラスを設定します
  const finalHtml = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ドキュメント</title>
  <style>
    /* GitHubのCSSを丸ごと埋め込み */
    ${cssContent}

    /* 画面中央に配置し、見やすい余白を作る設定 */
    body {
      box-sizing: border-box;
      min-width: 200px;
      max-width: 980px;
      margin: 0 auto;
      padding: 45px;
    }
    @media (max-width: 767px) {
      body { padding: 15px; }
    }
  </style>
</head>
<body class="markdown-body">
  ${bodyHtml}
  <script type="module">
    import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
    mermaid.initialize({ startOnLoad: true });
  </script>
</body>
</html>`;

  // 5. HTMLファイルとして書き出し
  fs.writeFileSync(outputPath, finalHtml);
  console.log(`✅ 成功: ${outputPath} を生成しました！`);

} catch (err) {
  console.error('❌ 変換中にエラーが発生しました:', err.message);
}