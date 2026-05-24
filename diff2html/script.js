const fs = require('fs');

const diffFilePath = 'sample.diff';
const reportPath = 'rendered-diff-report.html';

if (!fs.existsSync(diffFilePath)) {
    console.error(`エラー: ${diffFilePath} が見つかりません。`);
    process.exit(1);
}

const diffText = fs.readFileSync(diffFilePath, 'utf8');
const diffLines = diffText.split(/\r?\n/);

function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function parseDiffToRows(lines) {
    const rows = [];
    let inHunk = false;
    let oldLineNo = 0;
    let newLineNo = 0;
    let removedBuffer = [];
    let addedBuffer = [];

    function flushBuffers() {
        if (removedBuffer.length === 0 && addedBuffer.length === 0) {
            return;
        }

        const pairCount = Math.max(removedBuffer.length, addedBuffer.length);
        for (let i = 0; i < pairCount; i++) {
            const oldLine = removedBuffer[i] || null;
            const newLine = addedBuffer[i] || null;

            if (oldLine && newLine) {
                rows.push({
                    type: 'mod',
                    oldNo: oldLine.no,
                    oldText: oldLine.text,
                    newNo: newLine.no,
                    newText: newLine.text
                });
            } else if (oldLine) {
                rows.push({
                    type: 'del',
                    oldNo: oldLine.no,
                    oldText: oldLine.text,
                    newNo: null,
                    newText: ''
                });
            } else {
                rows.push({
                    type: 'add',
                    oldNo: null,
                    oldText: '',
                    newNo: newLine.no,
                    newText: newLine.text
                });
            }
        }

        removedBuffer = [];
        addedBuffer = [];
    }

    for (const line of lines) {
        if (line.startsWith('@@ ')) {
            flushBuffers();
            const match = line.match(/^@@\s+-(\d+)(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s+@@/);
            if (!match) {
                continue;
            }
            oldLineNo = Number(match[1]);
            newLineNo = Number(match[2]);
            inHunk = true;
            continue;
        }

        if (!inHunk) {
            continue;
        }

        if (line.startsWith('\\ No newline at end of file')) {
            continue;
        }

        if (line.startsWith('--- ') || line.startsWith('+++ ')) {
            continue;
        }

        if (line.startsWith(' ')) {
            flushBuffers();
            rows.push({
                type: 'context',
                oldNo: oldLineNo,
                oldText: line.slice(1),
                newNo: newLineNo,
                newText: line.slice(1)
            });
            oldLineNo += 1;
            newLineNo += 1;
            continue;
        }

        if (line.startsWith('-')) {
            removedBuffer.push({ no: oldLineNo, text: line.slice(1) });
            oldLineNo += 1;
            continue;
        }

        if (line.startsWith('+')) {
            addedBuffer.push({ no: newLineNo, text: line.slice(1) });
            newLineNo += 1;
        }
    }

    flushBuffers();
    return rows;
}

function markChangedMarkdownBlocks(rows) {
    const oldChangedLineNos = new Set();
    const newChangedLineNos = new Set();

    for (const row of rows) {
        if ((row.type === 'del' || row.type === 'mod') && row.oldNo !== null) {
            oldChangedLineNos.add(row.oldNo);
        }
        if ((row.type === 'add' || row.type === 'mod') && row.newNo !== null) {
            newChangedLineNos.add(row.newNo);
        }
    }

    const oldBlockChanged = new Set();
    const newBlockChanged = new Set();

    function markSide(isOld) {
        const changedSet = isOld ? oldChangedLineNos : newChangedLineNos;
        const blockSet = isOld ? oldBlockChanged : newBlockChanged;

        function isFenceLine(text) {
            return /^\s*(```|~~~)/.test(text);
        }

        function isTableLine(text) {
            return /^\s*\|.*\|\s*$/.test(text);
        }

        function isTableSeparator(text) {
            return /^\s*\|?\s*:?-{3,}(?:\s*\|\s*:?-{3,})+\s*\|?\s*$/.test(text);
        }

        let inFence = false;
        let fenceRows = [];
        let hasFenceChange = false;
        let fenceToken = '';

        let tableRows = [];
        let hasTableChange = false;
        let hasTableSeparator = false;

        function closeFence() {
            if (hasFenceChange) {
                for (const idx of fenceRows) {
                    blockSet.add(idx);
                }
            }
            inFence = false;
            fenceRows = [];
            hasFenceChange = false;
            fenceToken = '';
        }

        function closeTable() {
            if (tableRows.length >= 2 && hasTableSeparator && hasTableChange) {
                for (const idx of tableRows) {
                    blockSet.add(idx);
                }
            }
            tableRows = [];
            hasTableChange = false;
            hasTableSeparator = false;
        }

        for (let idx = 0; idx < rows.length; idx++) {
            const row = rows[idx];
            const lineNo = isOld ? row.oldNo : row.newNo;
            const text = isOld ? row.oldText : row.newText;

            if (lineNo === null) {
                continue;
            }

            const trimmed = text.trimStart();

            if (isFenceLine(text)) {
                closeTable();

                const tokenMatch = trimmed.match(/^(```+|~~~+)/);
                const token = tokenMatch ? tokenMatch[1].slice(0, 3) : '';
                if (!inFence) {
                    inFence = true;
                    fenceToken = token;
                    fenceRows = [idx];
                    hasFenceChange = changedSet.has(lineNo);
                } else {
                    fenceRows.push(idx);
                    if (changedSet.has(lineNo)) {
                        hasFenceChange = true;
                    }
                    const isClosing = token === fenceToken;
                    if (isClosing) {
                        closeFence();
                    }
                }
                continue;
            }

            if (inFence) {
                fenceRows.push(idx);
                if (changedSet.has(lineNo)) {
                    hasFenceChange = true;
                }
                continue;
            }

            if (isTableLine(text)) {
                tableRows.push(idx);
                if (changedSet.has(lineNo)) {
                    hasTableChange = true;
                }
                if (isTableSeparator(text)) {
                    hasTableSeparator = true;
                }
            } else {
                closeTable();
            }
        }

        if (inFence) {
            closeFence();
        }
        closeTable();
    }

    markSide(true);
    markSide(false);

    return { oldBlockChanged, newBlockChanged };
}

function collectMarkdownBlocks(rows) {
    const oldBlocks = new Map();
    const newBlocks = new Map();

    function collectSide(isOld) {
        const blockMap = isOld ? oldBlocks : newBlocks;

        function isFenceLine(text) {
            return /^\s*(```|~~~)/.test(text);
        }

        function isTableLine(text) {
            return /^\s*\|.*\|\s*$/.test(text);
        }

        function isTableSeparator(text) {
            return /^\s*\|?\s*:?-{3,}(?:\s*\|\s*:?-{3,})+\s*\|?\s*$/.test(text);
        }

        let inFence = false;
        let fenceToken = '';
        let fenceRows = [];
        let fenceLines = [];

        let tableRows = [];
        let tableLines = [];
        let hasTableSeparator = false;

        function saveFence() {
            if (fenceRows.length === 0) {
                return;
            }
            const block = {
                type: 'code',
                start: fenceRows[0],
                end: fenceRows[fenceRows.length - 1],
                markdown: fenceLines.join('\n')
            };
            for (const idx of fenceRows) {
                blockMap.set(idx, block);
            }
        }

        function saveTable() {
            if (tableRows.length < 2 || !hasTableSeparator) {
                tableRows = [];
                tableLines = [];
                hasTableSeparator = false;
                return;
            }
            const block = {
                type: 'table',
                start: tableRows[0],
                end: tableRows[tableRows.length - 1],
                markdown: tableLines.join('\n')
            };
            for (const idx of tableRows) {
                blockMap.set(idx, block);
            }
            tableRows = [];
            tableLines = [];
            hasTableSeparator = false;
        }

        for (let idx = 0; idx < rows.length; idx++) {
            const row = rows[idx];
            const lineNo = isOld ? row.oldNo : row.newNo;
            const text = isOld ? row.oldText : row.newText;

            if (lineNo === null) {
                if (!inFence) {
                    saveTable();
                }
                continue;
            }

            const trimmed = text.trimStart();

            if (isFenceLine(text)) {
                saveTable();

                const tokenMatch = trimmed.match(/^(```+|~~~+)/);
                const token = tokenMatch ? tokenMatch[1].slice(0, 3) : '';
                if (!inFence) {
                    inFence = true;
                    fenceToken = token;
                    fenceRows = [idx];
                    fenceLines = [text];
                } else {
                    fenceRows.push(idx);
                    fenceLines.push(text);
                    if (token === fenceToken) {
                        saveFence();
                        inFence = false;
                        fenceToken = '';
                        fenceRows = [];
                        fenceLines = [];
                    }
                }
                continue;
            }

            if (inFence) {
                fenceRows.push(idx);
                fenceLines.push(text);
                continue;
            }

            if (isTableLine(text)) {
                tableRows.push(idx);
                tableLines.push(text);
                if (isTableSeparator(text)) {
                    hasTableSeparator = true;
                }
            } else {
                saveTable();
            }
        }

        if (inFence) {
            saveFence();
        }
        saveTable();
    }

    collectSide(true);
    collectSide(false);
    return { oldBlocks, newBlocks };
}

function escapeInline(text) {
    return escapeHtml(text).replace(/`([^`]+)`/g, '<code>$1</code>');
}

function renderMarkdownBlock(block) {
    if (!block) {
        return '';
    }

    if (block.type === 'code') {
        const codeLines = block.markdown.split(/\r?\n/);
        const first = codeLines[0] || '';
        const m = first.trimStart().match(/^(```|~~~)\s*([\w-]+)?/);
        const lang = m && m[2] ? m[2] : '';
        const body = codeLines.length >= 2 ? codeLines.slice(1, -1).join('\n') : '';
        return `<pre class="rendered-code"><code class="language-${escapeHtml(lang)}">${escapeHtml(body)}</code></pre>`;
    }

    const lines = block.markdown.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) {
        return `<pre>${escapeHtml(block.markdown)}</pre>`;
    }

    const parseRow = (line) => line
        .trim()
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map((cell) => cell.trim());

    const header = parseRow(lines[0]);
    const body = lines.slice(2);
    const thead = `<thead><tr>${header.map((c) => `<th>${escapeInline(c)}</th>`).join('')}</tr></thead>`;
    const tbody = `<tbody>${body.map((ln) => {
        const cells = parseRow(ln);
        return `<tr>${cells.map((c) => `<td>${escapeInline(c)}</td>`).join('')}</tr>`;
    }).join('')}</tbody>`;

    return `<table class="rendered-table">${thead}${tbody}</table>`;
}

function renderRows(rows, oldBlockChanged, newBlockChanged, oldBlocks, newBlocks) {
    return rows.map((row, idx) => {
        const oldNo = row.oldNo === null ? '' : row.oldNo;
        const newNo = row.newNo === null ? '' : row.newNo;

        const oldBlock = oldBlocks.get(idx) || null;
        const newBlock = newBlocks.get(idx) || null;

        const oldIsBlockRow = Boolean(oldBlock);
        const newIsBlockRow = Boolean(newBlock);

        const oldRendered = oldIsBlockRow && oldBlock.start === idx ? renderMarkdownBlock(oldBlock) : '';
        const newRendered = newIsBlockRow && newBlock.start === idx ? renderMarkdownBlock(newBlock) : '';

        const oldText = escapeHtml(row.oldText || '');
        const newText = escapeHtml(row.newText || '');

        const oldClasses = [];
        const newClasses = [];

        if (!oldIsBlockRow && !newIsBlockRow && row.type === 'context') {
            oldClasses.push('context');
            newClasses.push('context');
        }
        if (!oldIsBlockRow && row.type === 'del') {
            oldClasses.push('del');
        }
        if (!newIsBlockRow && row.type === 'del') {
            newClasses.push('empty');
        }
        if (!oldIsBlockRow && row.type === 'add') {
            oldClasses.push('empty');
        }
        if (!newIsBlockRow && row.type === 'add') {
            newClasses.push('add');
        }
        if (!oldIsBlockRow && row.type === 'mod') {
            oldClasses.push('mod-old');
        }
        if (!newIsBlockRow && row.type === 'mod') {
            newClasses.push('mod-new');
        }

        if (oldIsBlockRow) {
            oldClasses.push('md-block-row');
        }
        if (newIsBlockRow) {
            newClasses.push('md-block-row');
        }

        if (oldBlockChanged.has(idx)) {
            oldClasses.push('md-block-changed-old');
        }
        if (newBlockChanged.has(idx)) {
            newClasses.push('md-block-changed-new');
        }

        const oldCellHtml = oldIsBlockRow
            ? (oldBlock.start === idx
                ? `<div class="md-block-wrap">${oldRendered}</div>`
                : '<div class="md-block-fill"></div>')
            : `<pre>${oldText}</pre>`;

        const newCellHtml = newIsBlockRow
            ? (newBlock.start === idx
                ? `<div class="md-block-wrap">${newRendered}</div>`
                : '<div class="md-block-fill"></div>')
            : `<pre>${newText}</pre>`;

        return `
            <tr>
                <td class="line-no old-no ${oldClasses.join(' ')}">${oldNo}</td>
                <td class="code old-code ${oldClasses.join(' ')}">${oldCellHtml}</td>
                <td class="line-no new-no ${newClasses.join(' ')}">${newNo}</td>
                <td class="code new-code ${newClasses.join(' ')}">${newCellHtml}</td>
            </tr>
        `;
    }).join('');
}

const rows = parseDiffToRows(diffLines);
const { oldBlockChanged, newBlockChanged } = markChangedMarkdownBlocks(rows);
const { oldBlocks, newBlocks } = collectMarkdownBlocks(rows);
const tableRowsHtml = renderRows(rows, oldBlockChanged, newBlockChanged, oldBlocks, newBlocks);

const reportHtml = `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>差分レポート</title>
    <style>
        :root {
            --bg: #f5f7fb;
            --panel: #ffffff;
            --text: #1f2937;
            --muted: #6b7280;
            --border: #dbe2ea;
            --context: #ffffff;
            --add: #e8fff0;
            --del: #ffeef0;
            --mod-old: #fff2d9;
            --mod-new: #e8f4ff;
            --block-old: #ffe4e8;
            --block-new: #e2f7e8;
        }

        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            background: linear-gradient(180deg, #eef3fb 0%, var(--bg) 40%, #edf2f8 100%);
            color: var(--text);
            font-family: Consolas, "Cascadia Code", "SFMono-Regular", Menlo, Monaco, "Liberation Mono", monospace;
        }

        header {
            position: sticky;
            top: 0;
            z-index: 10;
            background: rgba(255, 255, 255, 0.92);
            backdrop-filter: blur(6px);
            border-bottom: 1px solid var(--border);
            padding: 12px 16px;
        }

        h1 {
            margin: 0;
            font-size: 16px;
            font-weight: 700;
        }

        .summary {
            margin-top: 4px;
            color: var(--muted);
            font-size: 12px;
        }

        .container {
            padding: 14px;
        }

        .table-wrap {
            border: 1px solid var(--border);
            border-radius: 10px;
            overflow: auto;
            background: var(--panel);
            box-shadow: 0 8px 24px rgba(20, 39, 64, 0.08);
        }

        table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
        }

        thead th {
            position: sticky;
            top: 0;
            z-index: 2;
            background: #f9fbfe;
            border-bottom: 1px solid var(--border);
            font-size: 12px;
            color: #334155;
            padding: 8px;
            text-align: left;
        }

        th.no-col {
            width: 56px;
            text-align: right;
        }

        td {
            border-bottom: 1px solid #edf2f7;
            vertical-align: top;
        }

        td.line-no {
            text-align: right;
            color: var(--muted);
            user-select: none;
            padding: 0 8px;
            border-right: 1px solid #edf2f7;
        }

        td.code {
            padding: 0;
        }

        td.code pre {
            margin: 0;
            padding: 2px 10px;
            min-height: 22px;
            line-height: 1.45;
            white-space: pre-wrap;
            word-break: break-word;
            font-family: inherit;
            font-size: 12px;
        }

        td.code.del pre,
        td.code.mod-old pre {
            text-decoration: line-through;
        }

        .context {
            background: var(--context);
        }

        .add {
            background: var(--add);
        }

        .del {
            background: var(--del);
        }

        .mod-old {
            background: var(--mod-old);
        }

        .mod-new {
            background: var(--mod-new);
        }

        .empty {
            background: #fafbfc;
            color: #c5ced8;
        }

        .md-block-changed-old {
            box-shadow: inset 4px 0 0 #d63254;
            background-color: var(--block-old);
        }

        .md-block-changed-new {
            box-shadow: inset 4px 0 0 #1f8f4b;
            background-color: var(--block-new);
        }

        .md-block-row {
            background: #f8fafc;
        }

        .md-block-wrap {
            padding: 8px 10px;
        }

        .md-block-fill {
            min-height: 22px;
        }

        .rendered-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            font-size: 12px;
            background: #ffffff;
        }

        .rendered-table th,
        .rendered-table td {
            border: 1px solid #d7e0ea;
            padding: 6px 8px;
            text-align: left;
        }

        .rendered-code {
            margin: 0;
            padding: 10px;
            border: 1px solid #d5dee8;
            border-radius: 6px;
            background: #ffffff;
            overflow: auto;
            line-height: 1.45;
            font-size: 12px;
            white-space: pre;
            text-decoration: none;
        }

        .rendered-code code {
            font-family: inherit;
        }

        @media (max-width: 900px) {
            .table-wrap {
                border-radius: 0;
            }
        }
    </style>
</head>
<body>
    <header>
        <h1>差分レポート (サイドバイサイド)</h1>
        <div class="summary">通常テキストは行単位差分で表示し、Markdownの表ブロックとコードブロックのみブロック全体を強調表示します。</div>
    </header>
    <div class="container">
        <div class="table-wrap">
            <table>
                <thead>
                    <tr>
                        <th class="no-col">Old</th>
                        <th>修正前</th>
                        <th class="no-col">New</th>
                        <th>修正後</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRowsHtml}
                </tbody>
            </table>
        </div>
    </div>
</body>
</html>
`;

fs.writeFileSync(reportPath, reportHtml, 'utf8');
console.log(`✅ レポートを作成しました: ${reportPath}`);