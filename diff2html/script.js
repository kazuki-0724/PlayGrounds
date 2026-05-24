const fs = require('fs');
const { marked } = require('marked');
const diff = require('diff');

// 1. ファイルパスの設定
const diffFilePath = 'sample.diff'; // 読み込むdiffファイル
const reportPath = 'rendered-diff-report.html'; // 出力するHTML

if (!fs.existsSync(diffFilePath)) {
    console.error(`エラー: ${diffFilePath} が見つかりません。`);
    process.exit(1);
}

// 2. Diffファイルの解析（変更前・変更後のMarkdownソースを復元）
const diffText = fs.readFileSync(diffFilePath, 'utf8');
const diffLines = diffText.split('\n');
let oldMdLines = [];
let newMdLines = [];
let inHunk = false;

for (const line of diffLines) {
    if (line.startsWith('---') || line.startsWith('+++') || line.startsWith('diff ') || line.startsWith('index ')) continue;
    if (line.startsWith('@@ ')) {
        inHunk = true;
        if (oldMdLines.length > 0) { oldMdLines.push('\n'); newMdLines.push('\n'); }
        continue;
    }
    if (inHunk) {
        if (line.startsWith('-')) {
            oldMdLines.push(line.substring(1));
        } else if (line.startsWith('+')) {
            newMdLines.push(line.substring(1));
        } else if (line.startsWith(' ')) {
            oldMdLines.push(line.substring(1));
            newMdLines.push(line.substring(1));
        } else if (line === '') {
            oldMdLines.push('');
            newMdLines.push('');
        }
    }
}

const oldMd = oldMdLines.join('\n');
const newMd = newMdLines.join('\n');

// 3. MarkdownのAST (Tokens) を取得
// これにより「どこがテーブルで、どこがテキストか」を構造的に把握します
const oldTokens = marked.lexer(oldMd);
const newTokens = marked.lexer(newMd);

// 4. トークン（ブロック）レベルでの差分比較
const changes = diff.diffArrays(oldTokens, newTokens, {
    comparator: (l, r) => l.raw === r.raw
});

let leftHtml = '';
let rightHtml = '';

// テーブルやコードブロックが含まれているか判定する関数
const hasComplexBlock = (tokens) => tokens.some(t => t.type === 'table' || t.type === 'code');

// 5. 差分結果から左右のHTMLを構築
for (let i = 0; i < changes.length; i++) {
    const change = changes[i];

    if (change.removed) {
        // 次のチャンクが「追加」なら、置換（変更）とみなす
        if (i + 1 < changes.length && changes[i + 1].added) {
            const nextChange = changes[i + 1];
            
            const removedRaw = change.value.map(t => t.raw).join('');
            const addedRaw = nextChange.value.map(t => t.raw).join('');
            
            // ★ 条件分岐: テキストのみか、テーブル等を含むか
            if (!hasComplexBlock(change.value) && !hasComplexBlock(nextChange.value)) {
                // 【テキストのみの場合】文字レベルの差分を取り、インラインでハイライトタグを埋め込む
                const wordDiff = diff.diffWords(removedRaw, addedRaw);
                let leftMarkdown = '';
                let rightMarkdown = '';
                
                wordDiff.forEach(part => {
                    if (part.added) {
                        rightMarkdown += `<span class="hl-text-add">${part.value}</span>`;
                    } else if (part.removed) {
                        leftMarkdown += `<span class="hl-text-del">${part.value}</span>`;
                    } else {
                        leftMarkdown += part.value;
                        rightMarkdown += part.value;
                    }
                });
                
                leftHtml += marked.parse(leftMarkdown);
                rightHtml += marked.parse(rightMarkdown);
            } else {
                // 【テーブル・コードの場合】中身は見ず、ブロック全体をハイライト用のdivで囲む
                leftHtml += `<div class="hl-bg-del">${marked.parse(removedRaw)}</div>`;
                rightHtml += `<div class="hl-bg-add">${marked.parse(addedRaw)}</div>`;
            }
            i++; // 次のaddedチャンクは処理済みとしてスキップ
        } else {
            // 単純な削除（置換ではない）
            const removedRaw = change.value.map(t => t.raw).join('');
            leftHtml += `<div class="hl-bg-del">${marked.parse(removedRaw)}</div>`;
        }
    } else if (change.added) {
        // 単純な追加
        const addedRaw = change.value.map(t => t.raw).join('');
        rightHtml += `<div class="hl-bg-add">${marked.parse(addedRaw)}</div>`;
    } else {
        // 変更なし（共通部分）
        const commonRaw = change.value.map(t => t.raw).join('');
        const html = marked.parse(commonRaw);
        leftHtml += html;
        rightHtml += html;
    }
}

// 6. レポートHTMLの組み立て
const reportHtml = `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Diff MD レンダリング比較</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f6f8fa; display: flex; flex-direction: column; height: 100vh; }
        header { background: #fff; padding: 15px 20px; border-bottom: 1px solid #e1e4e8; z-index: 10; }
        h1 { font-size: 18px; margin: 0; color: #24292e; }
        .split-container { display: flex; flex: 1; overflow: hidden; }
        .pane { flex: 1; padding: 20px 40px; overflow-y: auto; background: #fff; }
        .pane-left { border-right: 1px solid #e1e4e8; background-color: #fafbfc; }
        
        /* Markdownスタイル */
        .markdown-body { color: #24292e; line-height: 1.6; word-wrap: break-word; }
        .markdown-body table { border-collapse: collapse; width: 100%; margin-bottom: 16px; }
        .markdown-body table th, .markdown-body table td { border: 1px solid #dfe2e5; padding: 6px 13px; }
        .markdown-body table tr:nth-child(2n) { background-color: #f6f8fa; }
        .markdown-body pre { background-color: #f6f8fa; padding: 16px; border-radius: 6px; overflow: auto; }
        
        /* ★ テキストのインラインハイライト */
        .hl-text-del { background-color: #ffeef0; text-decoration: line-through; color: #cb2431; border-radius: 3px; padding: 0.1em 0.2em; }
        .hl-text-add { background-color: #e6ffed; color: #22863a; border-radius: 3px; padding: 0.1em 0.2em; }
        
        /* ★ テーブル・コード等の全体ハイライト */
        .hl-bg-del { background-color: #ffeef0; border-left: 4px solid #cb2431; padding: 16px; margin-bottom: 16px; border-radius: 0 4px 4px 0; }
        .hl-bg-add { background-color: #e6ffed; border-left: 4px solid #22863a; padding: 16px; margin-bottom: 16px; border-radius: 0 4px 4px 0; }
        .hl-bg-del > :last-child, .hl-bg-add > :last-child { margin-bottom: 0; }
        .hl-bg-del table, .hl-bg-add table { background-color: #fff; } /* 表内は白背景で見やすく */
    </style>
</head>
<body>
    <header><h1>MD差分レンダリングレポート (テーブル・コード全体色付け版)</h1></header>
    <div class="split-container">
        <div class="pane pane-left" id="left-pane">
            <div style="color: #cb2431; font-weight: bold; margin-bottom: 15px;">修正前 (Old)</div>
            <div class="markdown-body">${leftHtml}</div>
        </div>
        <div class="pane pane-right" id="right-pane">
            <div style="color: #22863a; font-weight: bold; margin-bottom: 15px;">修正後 (New)</div>
            <div class="markdown-body">${rightHtml}</div>
        </div>
    </div>
    <script>
        const syncScroll = (src, dest) => {
            let isSyncing = false;
            src.addEventListener('scroll', () => {
                if (!isSyncing) {
                    isSyncing = true;
                    dest.scrollTop = (src.scrollTop / (src.scrollHeight - src.clientHeight)) * (dest.scrollHeight - dest.clientHeight);
                }
                isSyncing = false;
            });
        };
        const leftPane = document.getElementById('left-pane');
        const rightPane = document.getElementById('right-pane');
        syncScroll(leftPane, rightPane);
        syncScroll(rightPane, leftPane);
    </script>
</body>
</html>
`;

fs.writeFileSync(reportPath, reportHtml, 'utf8');
console.log(`✅ レポートを作成しました: ${reportPath}`);

/**
 * npm install marked diff
 */