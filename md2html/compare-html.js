const fs = require('fs');
const HtmlDiff = require('htmldiff-js').default;

// 1. すでに変換済みのHTMLファイルを読み込む
const oldHtml = fs.readFileSync('output.html', 'utf-8');
const newHtml = fs.readFileSync('output2.html', 'utf-8');

// 2. HTMLの差分を生成
// ※内部のテキストノードやタグ構造を比較し、<ins>と<del>タグを付与します
const rawDiffHtml = HtmlDiff.execute(oldHtml, newHtml);

// 3. コードブロック・mermaidブロック内の差分はピンポイントではなくブロック全体をオレンジハイライトに変換
function cleanDiffTags(html) {
  return html
    .replace(/<ins\b[^>]*>([\s\S]*?)<\/ins>/gi, '$1')
    .replace(/<del\b[^>]*>[\s\S]*?<\/del>/gi, '');
}

function highlightCodeBlockDiffs(html) {
  // <pre> ブロック
  let result = html.replace(/<pre\b[^>]*>[\s\S]*?<\/pre>/gi, (block) => {
    if (/<ins\b|<del\b/i.test(block)) {
      const cleaned = cleanDiffTags(block);
      return cleaned.replace(/^<pre(\s|>)/i, '<pre class="code-diff"$1');
    }
    return block;
  });

  // <div class="mermaid"> ブロック
  result = result.replace(/<div\s+class="mermaid">[\s\S]*?<\/div>/gi, (block) => {
    if (/<ins\b|<del\b/i.test(block)) {
      const cleaned = cleanDiffTags(block);
      return cleaned.replace(/^<div\s+class="mermaid">/i, '<div class="mermaid code-diff">');
    }
    return block;
  });

  return result;
}

const diffHtml = highlightCodeBlockDiffs(rawDiffHtml);

// 3. 見やすくするためのCSSを追加してファイルに保存
const finalOutput = `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>設計書 差分レポート</title>
    <style>
        body { 
            font-family: sans-serif; 
            line-height: 1.6; 
            padding: 20px; 
            color: #333;
        }
        /* 追加された箇所（緑ハイライト） */
        ins { 
            background-color: #e6ffec; 
            text-decoration: none; 
            color: #1a7f37; 
            font-weight: bold; 
            padding: 2px 4px;
            border-radius: 3px;
        }
        /* 削除された箇所（赤の取り消し線） */
        del { 
            background-color: #ffebe9; 
            text-decoration: line-through; 
            color: #cf222e; 
            padding: 2px 4px;
            border-radius: 3px;
        }
        /* 変更箇所を際立たせるためのテーブル用調整（必要に応じて） */
        table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
        th, td { border: 1px solid #ccc; padding: 8px; }
        /* コードブロック・mermaidブロック全体に差分があった場合のオレンジハイライト */
        pre.code-diff,
        div.mermaid.code-diff {
            background-color: #fff3e0;
            border: 2px solid #ff9800;
            border-radius: 4px;
            outline: 3px solid #ff980055;
        }
    </style>
</head>
<body>
    <h1>設計書 差分レポート</h1>
    <hr>
    ${diffHtml}
</body>
</html>
`;

fs.writeFileSync('diff-report.html', finalOutput);
console.log('差分ファイル (diff-report.html) を生成しました。ブラウザで開いて確認してください。');