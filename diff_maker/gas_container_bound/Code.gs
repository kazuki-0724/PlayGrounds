var PROJECT_MASTER_SHEET = '案件マスタ';
var REVIEWER_MASTER_SHEET = '確認者マスタ';
var META_SHEET = '出力履歴';
var REPORT_HEADER_ROW = 1;

function onOpen() {
  //ensureWorkbookSheets_();
  SpreadsheetApp.getUi()
    .createMenu('差分管理')
    .addItem('差分リスト作成', 'showCreateDiffDialog')
    .addToUi();
}

function showCreateDiffDialog() {
  ensureWorkbookSheets_();
  var html = HtmlService.createHtmlOutputFromFile('CreateDiffDialog')
    .setWidth(1280)
    .setHeight(900);
  SpreadsheetApp.getUi().showModalDialog(html, '差分リスト作成');
}

function createDiffListsInCurrentSpreadsheet(payload) {
  validateCreatePayload_(payload);

  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  ensureWorkbookSheets_();

  var context = getParentFolderContext_(spreadsheet);
  var projectSheet = spreadsheet.getSheetByName(PROJECT_MASTER_SHEET);
  var reviewerSheet = spreadsheet.getSheetByName(REVIEWER_MASTER_SHEET);
  var outputHistorySheet = spreadsheet.getSheetByName(META_SHEET);
  var createdAt = new Date();
  var createdBy = Session.getActiveUser().getEmail() || 'unknown';
  var reportResults = [];

  payload.jobs.forEach(function(job, index) {
    var outputName = buildOutputName_(job.outputName || job.fileName || ('diff_' + (index + 1)));
    ensureWritableSheetName_(outputName);

    var normalizedDiffText = normalizeNewlines_(job.diffText);
    var parsedUnits = parseDiffTextToUnits_(normalizedDiffText);
    if (!parsedUnits.length) {
      throw new Error('diff から差分単位を抽出できませんでした: ' + outputName);
    }

    var diffFile = saveNamedFileToDrive_(context.folder, outputName + '.diff', normalizedDiffText, MimeType.PLAIN_TEXT);
    var htmlDocument = buildPreviewHtmlDocument_(outputName, job.previewHtml || '');
    var htmlFile = saveNamedFileToDrive_(context.folder, outputName + '.html', htmlDocument, MimeType.HTML);
    var reportSheet = getOrCreateReportSheet_(spreadsheet, outputName);

    populateReportSheet_(reportSheet, {
      outputName: outputName,
      diffFile: diffFile,
      htmlFile: htmlFile,
      createdAt: createdAt,
      createdBy: createdBy,
      totalUnits: parsedUnits.length,
      totalFiles: countDistinctFiles_(parsedUnits)
    }, parsedUnits, projectSheet, reviewerSheet);

    reportResults.push({
      outputName: outputName,
      sheetName: reportSheet.getName(),
      htmlFileName: htmlFile.getName(),
      htmlFileUrl: htmlFile.getUrl(),
      diffFileName: diffFile.getName(),
      diffFileUrl: diffFile.getUrl(),
      totalUnits: parsedUnits.length,
      totalFiles: countDistinctFiles_(parsedUnits),
      createdAt: createdAt,
      createdBy: createdBy
    });
  });

  updateOutputHistorySheet_(outputHistorySheet, reportResults);

  return {
    createdCount: reportResults.length,
    reports: reportResults
  };
}

function ensureWorkbookSheets_() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  var projectSheet = spreadsheet.getSheetByName(PROJECT_MASTER_SHEET);
  if (!projectSheet) {
    projectSheet = spreadsheet.insertSheet(PROJECT_MASTER_SHEET);
    projectSheet.getRange(1, 1).setValue('案件名');
    projectSheet.getRange(2, 1, 3, 1).setValues([
      ['案件A'],
      ['案件B'],
      ['案件C']
    ]);
    formatProjectMasterSheet_(projectSheet);
  }

  var reviewerSheet = spreadsheet.getSheetByName(REVIEWER_MASTER_SHEET);
  if (!reviewerSheet) {
    reviewerSheet = spreadsheet.insertSheet(REVIEWER_MASTER_SHEET);
    reviewerSheet.getRange(1, 1).setValue('確認者名');
    reviewerSheet.getRange(2, 1).setValues([
      ['hogehoge']
    ]);
    formatReviewerMasterSheet_(reviewerSheet);
  }

  var outputHistorySheet = spreadsheet.getSheetByName(META_SHEET);
  if (!outputHistorySheet) {
    outputHistorySheet = spreadsheet.insertSheet(META_SHEET);
    formatOutputHistorySheet_(outputHistorySheet, 0);
  }
}

function getParentFolderContext_(spreadsheet) {
  var file = DriveApp.getFileById(spreadsheet.getId());
  var parents = file.getParents();
  var folder = parents.hasNext() ? parents.next() : DriveApp.getRootFolder();
  return {
    file: file,
    folder: folder
  };
}

function saveNamedFileToDrive_(folder, fileName, content, mimeType) {
  trashFilesByName_(folder, fileName);
  return folder.createFile(fileName, content, mimeType);
}

function trashFilesByName_(folder, fileName) {
  var files = folder.getFilesByName(fileName);
  while (files.hasNext()) {
    files.next().setTrashed(true);
  }
}

function getOrCreateReportSheet_(spreadsheet, sheetName) {
  var sheet = spreadsheet.getSheetByName(sheetName);
  if (sheet) {
    sheet.clear();
    sheet.clearFormats();
    sheet.clearConditionalFormatRules();
    return sheet;
  }
  return spreadsheet.insertSheet(sheetName);
}

function populateReportSheet_(sheet, summary, diffUnits, projectSheet, reviewerSheet) {
  sheet.clear();
  sheet.getRange(REPORT_HEADER_ROW, 1, 1, 5).setValues([['No', 'ファイル名', 'パス', '案件', '確認者']]);

  var rows = diffUnits.map(function(unit) {
    return [
      unit.no,
      unit.fileName,
      unit.filePath,
      '',
      ''
    ];
  });
  if (rows.length) {
    sheet.getRange(REPORT_HEADER_ROW + 1, 1, rows.length, 5).setValues(rows);
  }

  applyDropdownValidations_(sheet, projectSheet, reviewerSheet, rows.length, REPORT_HEADER_ROW + 1);
  formatReportSheet_(sheet, rows.length);
}

function applyDropdownValidations_(sheet, projectSheet, reviewerSheet, rowCount, startRow) {
  if (!rowCount) {
    return;
  }

  var projectLastRow = Math.max(projectSheet.getLastRow(), 2);
  var reviewerLastRow = Math.max(reviewerSheet.getLastRow(), 2);
  var projectRange = projectSheet.getRange(2, 1, Math.max(projectLastRow - 1, 1), 1);
  var reviewerRange = reviewerSheet.getRange(2, 1, Math.max(reviewerLastRow - 1, 1), 1);

  var projectValidation = SpreadsheetApp.newDataValidation()
    .requireValueInRange(projectRange, true)
    .setAllowInvalid(true)
    .build();
  var reviewerValidation = SpreadsheetApp.newDataValidation()
    .requireValueInRange(reviewerRange, true)
    .setAllowInvalid(true)
    .build();

  sheet.getRange(startRow, 4, rowCount, 1).setDataValidation(projectValidation);
  sheet.getRange(startRow, 5, rowCount, 1).setDataValidation(reviewerValidation);
}

function updateOutputHistorySheet_(sheet, reports) {
  var headers = [['出力名', 'シート名', 'HTMLファイル', 'diffファイル', '作成日時', '作成者', '差分単位数', '対象ファイル数']];
  var existingRows = [];
  if (sheet.getLastRow() > 1) {
    existingRows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 8).getValues();
  }

  var byOutputName = {};
  existingRows.forEach(function(row) {
    if (row[0]) {
      byOutputName[String(row[0])] = row;
    }
  });

  reports.forEach(function(report) {
    byOutputName[report.outputName] = [
      report.outputName,
      report.sheetName,
      report.htmlFileUrl,
      report.diffFileUrl,
      toSerializableCellValue_(report.createdAt),
      report.createdBy,
      report.totalUnits,
      report.totalFiles
    ];
  });

  var outputNames = Object.keys(byOutputName).sort();
  var rows = outputNames.map(function(outputName) {
    return byOutputName[outputName];
  });

  sheet.clear();
  sheet.getRange(1, 1, 1, 8).setValues(headers);
  if (rows.length) {
    sheet.getRange(2, 1, rows.length, 8).setValues(rows);
  }
  formatOutputHistorySheet_(sheet, rows.length);
}

function formatReportSheet_(sheet, rowCount) {
  sheet.setFrozenRows(REPORT_HEADER_ROW);
  if (sheet.getFilter()) {
    sheet.getFilter().remove();
  }
  sheet.getRange(REPORT_HEADER_ROW, 1, 1, 5)
    .setBackground('#1f4e78')
    .setFontColor('#ffffff')
    .setFontWeight('bold');
  if (rowCount > 0) {
    sheet.getRange(REPORT_HEADER_ROW, 1, rowCount + 1, 5).createFilter();
  }
  sheet.setColumnWidths(1, 1, 60);
  sheet.setColumnWidths(2, 1, 220);
  sheet.setColumnWidths(3, 1, 360);
  sheet.setColumnWidths(4, 1, 240);
  sheet.setColumnWidths(5, 2, 90);
  sheet.setColumnWidths(7, 2, 180);
  // sheet.getRange(1, 1, 4, 1).setFontWeight('bold').setBackground('#f3f6fa');
  // sheet.getRange(1, 3, 4, 1).setFontWeight('bold').setBackground('#f3f6fa');
}

function formatProjectMasterSheet_(sheet) {
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1).setBackground('#4f81bd').setFontColor('#ffffff').setFontWeight('bold');
  sheet.setColumnWidth(1, 260);
}

function formatReviewerMasterSheet_(sheet) {
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1).setBackground('#8064a2').setFontColor('#ffffff').setFontWeight('bold');
  sheet.setColumnWidth(1, 260);
}

function formatOutputHistorySheet_(sheet, rowCount) {
  sheet.setFrozenRows(1);
  if (sheet.getFilter()) {
    sheet.getFilter().remove();
  }
  sheet.getRange(1, 1, 1, 8).setBackground('#385723').setFontColor('#ffffff').setFontWeight('bold');
  if (rowCount > 0) {
    sheet.getRange(1, 1, rowCount + 1, 8).createFilter();
  }
  sheet.setColumnWidths(1, 2, 180);
  sheet.setColumnWidths(3, 2, 280);
  sheet.setColumnWidths(5, 2, 160);
  sheet.setColumnWidths(7, 2, 110);
}

function validateCreatePayload_(payload) {
  if (!payload) {
    throw new Error('payload is required.');
  }
  if (!payload.jobs || !payload.jobs.length) {
    throw new Error('少なくとも1件の diff ファイルが必要です。');
  }

  var used = {};
  payload.jobs.forEach(function(job, index) {
    if (!job || !job.diffText || !String(job.diffText).trim()) {
      throw new Error('diffText is required at index ' + index + '.');
    }
    var outputName = buildOutputName_(job.outputName || job.fileName || ('diff_' + (index + 1)));
    if (used[outputName]) {
      throw new Error('出力名が重複しています: ' + outputName);
    }
    used[outputName] = true;
  });
}

function parseDiffTextToUnits_(diffText) {
  var blocks = String(diffText).match(/(^diff --git [\s\S]*?)(?=^diff --git |$)/gm) || [];
  var units = [];

  blocks.forEach(function(block) {
    var lines = block.split(/\n/);
    var fileHeaderLines = [];
    var currentHunkLines = [];
    var currentHunkHeader = '';
    var headerLine = lines[0] || '';
    var matched = headerLine.match(/^diff --git a\/(.+?) b\/(.+)$/);
    var filePath = matched ? matched[2] : 'unknown';
    var fileName = filePath.split('/').pop();

    lines.forEach(function(line) {
      if (/^@@ /.test(line)) {
        if (currentHunkLines.length) {
          units.push(buildDiffUnit_(filePath, fileName, fileHeaderLines, currentHunkHeader, currentHunkLines));
        }
        currentHunkHeader = line;
        currentHunkLines = [line];
        return;
      }

      if (!currentHunkHeader) {
        fileHeaderLines.push(line);
      } else {
        currentHunkLines.push(line);
      }
    });

    if (currentHunkLines.length) {
      units.push(buildDiffUnit_(filePath, fileName, fileHeaderLines, currentHunkHeader, currentHunkLines));
    } else if (fileHeaderLines.length) {
      units.push(buildDiffUnit_(filePath, fileName, fileHeaderLines, '(file header only)', []));
    }
  });

  return units.map(function(unit, index) {
    unit.no = index + 1;
    return unit;
  });
}

function buildDiffUnit_(filePath, fileName, fileHeaderLines, hunkHeader, hunkLines) {
  var additions = 0;
  var deletions = 0;
  hunkLines.forEach(function(line) {
    if (/^\+[^+]/.test(line)) {
      additions += 1;
    }
    if (/^-[^-]/.test(line)) {
      deletions += 1;
    }
  });

  return {
    fileKey: 'diff_' + Utilities.getUuid(),
    filePath: filePath,
    fileName: fileName,
    hunkHeader: hunkHeader || '(no hunk header)',
    additions: additions,
    deletions: deletions,
    diffText: fileHeaderLines.concat(hunkLines).join('\n').trim()
  };
}

function getDriveFileIdFromUrl_(url) {
  var value = String(url || '');
  var directMatch = value.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (directMatch) {
    return directMatch[1];
  }

  var pathMatch = value.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (pathMatch) {
    return pathMatch[1];
  }

  return '';
}

function normalizeNewlines_(text) {
  return String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function buildOutputName_(value) {
  return String(value || '')
    .trim()
    .replace(/[\\\/\?\*\[\]:]/g, '_')
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 100) || 'diff_output';
}

function ensureWritableSheetName_(sheetName) {
  if (sheetName === PROJECT_MASTER_SHEET || sheetName === REVIEWER_MASTER_SHEET || sheetName === META_SHEET) {
    throw new Error('出力名に予約済みシート名は使えません: ' + sheetName);
  }
}

function buildPreviewHtmlDocument_(title, renderedHtml) {
  var safeTitle = escapeHtml_(title);
  return [
    '<!doctype html>',
    '<html lang="ja">',
    '<head>',
    '  <meta charset="utf-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1">',
    '  <title>' + safeTitle + '</title>',
    '  <link rel="stylesheet" href="https://unpkg.com/diff2html/bundles/css/diff2html.min.css">',
    '  <style>',
    '    body{margin:0;padding:16px;background:#f6f8fa;color:#222;font:14px/1.5 Segoe UI,system-ui,sans-serif}',
    '    .panel{background:#fff;border:1px solid #e6edf3;border-radius:12px;padding:16px;margin-bottom:16px}',
    '    .title{margin:0 0 8px;font-size:20px}',
    '    .hint{margin:0;color:#6e7781}',
    '    #diffOutput{background:#fff;border:1px solid #e6edf3;border-radius:12px;padding:12px;overflow:auto}',
    '    #diffOutput .d2h-wrapper{min-width:1080px}',
    '    .file-toggle{position:absolute;top:7px;right:10px;z-index:2;background:#eef3f8;color:#24292e;border:1px solid #d0d7de;border-radius:6px;padding:4px 10px;font-size:12px;cursor:pointer}',
    '    .d2h-file-header{position:relative;display:flex;align-items:center;gap:8px;padding-right:92px}',
    '    .d2h-file-wrapper.is-collapsed .d2h-file-diff,.d2h-file-wrapper.is-collapsed .d2h-files-diff{display:none}',
    '  </style>',
    '</head>',
    '<body>',
    '  <section class="panel">',
    '    <h1 class="title">' + safeTitle + '</h1>',
    '    <p class="hint">保存済みの差分プレビュー HTML です。</p>',
    '  </section>',
    '  <section id="diffOutput">' + String(renderedHtml || '') + '</section>',
    '  <script>',
    '    (function(){',
    '      document.querySelectorAll(".d2h-file-wrapper").forEach(function(fileWrapper){',
    '        var header=fileWrapper.querySelector(".d2h-file-header");',
    '        var fileDiff=fileWrapper.querySelector(".d2h-file-diff, .d2h-files-diff");',
    '        if(!header||!fileDiff||header.querySelector(".file-toggle")){return;}',
    '        var button=document.createElement("button");',
    '        button.type="button";',
    '        button.className="file-toggle";',
    '        button.textContent="折りたたむ";',
    '        button.addEventListener("click", function(){',
    '          var collapsed=fileWrapper.classList.toggle("is-collapsed");',
    '          button.textContent=collapsed?"展開":"折りたたむ";',
    '        });',
    '        header.appendChild(button);',
    '      });',
    '    })();',
    '  </script>',
    '</body>',
    '</html>'
  ].join('\n');
}

function escapeHtml_(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toSerializableCellValue_(value) {
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy/MM/dd HH:mm:ss');
  }
  return value == null ? '' : String(value);
}

function countDistinctFiles_(diffUnits) {
  var map = {};
  diffUnits.forEach(function(unit) {
    map[unit.filePath] = true;
  });
  return Object.keys(map).length;
}

function sumProperty_(items, propertyName) {
  return items.reduce(function(total, item) {
    return total + Number(item[propertyName] || 0);
  }, 0);
}