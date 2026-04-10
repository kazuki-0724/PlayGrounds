var DIFF_LIST_SHEET = '差分リスト';
var PROJECT_MASTER_SHEET = '案件マスタ';
var REVIEWER_MASTER_SHEET = '確認者マスタ';
var META_SHEET = 'マスタ';

function onOpen() {
  ensureWorkbookSheets_();
  SpreadsheetApp.getUi()
    .createMenu('差分管理')
    .addItem('差分リスト作成', 'showCreateDiffDialog')
    .addItem('案件マスタを開く', 'openProjectMasterSheet')
    .addItem('確認者マスタを開く', 'openReviewerMasterSheet')
    .addItem('差分リストを開く', 'openDiffListSheet')
    .addToUi();
}

function doGet(e) {
  var view = e && e.parameter ? e.parameter.view : '';
  if (view === 'detail') {
    return HtmlService.createHtmlOutputFromFile('DiffDetail')
      .setTitle('差分詳細')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  return HtmlService.createHtmlOutput('<p>Container-bound GAS detail endpoint.</p>')
    .setTitle('Diff Detail')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function showCreateDiffDialog() {
  ensureWorkbookSheets_();
  var html = HtmlService.createHtmlOutputFromFile('CreateDiffDialog')
    .setWidth(1180)
    .setHeight(860);
  SpreadsheetApp.getUi().showModalDialog(html, '差分リスト作成');
}

function getDialogBootstrapData() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  ensureWorkbookSheets_();

  return {
    userEmail: Session.getActiveUser().getEmail() || '',
    spreadsheetUrl: spreadsheet.getUrl(),
    webAppUrl: ScriptApp.getService().getUrl() || ''
  };
}

function openProjectMasterSheet() {
  ensureWorkbookSheets_();
  SpreadsheetApp.getActiveSpreadsheet().setActiveSheet(SpreadsheetApp.getActiveSpreadsheet().getSheetByName(PROJECT_MASTER_SHEET));
}

function openReviewerMasterSheet() {
  ensureWorkbookSheets_();
  SpreadsheetApp.getActiveSpreadsheet().setActiveSheet(SpreadsheetApp.getActiveSpreadsheet().getSheetByName(REVIEWER_MASTER_SHEET));
}

function openDiffListSheet() {
  ensureWorkbookSheets_();
  SpreadsheetApp.getActiveSpreadsheet().setActiveSheet(SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DIFF_LIST_SHEET));
}

function createDiffListInCurrentSpreadsheet(payload) {
  validateCreatePayload_(payload);

  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  ensureWorkbookSheets_();
  var normalizedDiffText = normalizeNewlines_(payload.diffText);
  var parsedUnits = parseDiffTextToUnits_(normalizedDiffText);
  if (!parsedUnits.length) {
    throw new Error('diff から差分単位を抽出できませんでした。');
  }

  var context = getParentFolderContext_(spreadsheet);
  var diffFile = saveDiffFileToDrive_(context.folder, payload.fileName, normalizedDiffText);
  var projectSheet = spreadsheet.getSheetByName(PROJECT_MASTER_SHEET);
  var reviewerSheet = spreadsheet.getSheetByName(REVIEWER_MASTER_SHEET);
  var diffListSheet = spreadsheet.getSheetByName(DIFF_LIST_SHEET);
  var metaSheet = spreadsheet.getSheetByName(META_SHEET);

  parsedUnits.forEach(function(unit) {
    unit.detailUrl = buildDetailUrl_(spreadsheet.getId(), unit.fileKey);
  });

  var summary = {
    spreadsheetId: spreadsheet.getId(),
    spreadsheetUrl: spreadsheet.getUrl(),
    diffFileName: diffFile.getName(),
    diffFileUrl: diffFile.getUrl(),
    importedAt: new Date(),
    importedBy: Session.getActiveUser().getEmail() || 'unknown',
    totalUnits: parsedUnits.length,
    totalFiles: countDistinctFiles_(parsedUnits),
    totalAdditions: sumProperty_(parsedUnits, 'additions'),
    totalDeletions: sumProperty_(parsedUnits, 'deletions')
  };

  populateDiffListSheet_(diffListSheet, parsedUnits, spreadsheet.getId());
  applyDropdownValidations_(diffListSheet, projectSheet, reviewerSheet, parsedUnits.length);
  populateMetaSheet_(metaSheet, summary, parsedUnits);

  return {
    spreadsheetUrl: spreadsheet.getUrl(),
    diffFileUrl: diffFile.getUrl(),
    totalUnits: summary.totalUnits,
    totalFiles: summary.totalFiles
  };
}

function getDiffDetail(spreadsheetId, fileKey) {
  if (!spreadsheetId || !fileKey) {
    throw new Error('spreadsheetId and fileKey are required.');
  }

  var spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  var metaSheet = spreadsheet.getSheetByName(META_SHEET);
  if (!metaSheet) {
    throw new Error('マスタシートが見つかりません。');
  }

  var values = metaSheet.getDataRange().getValues();
  for (var i = 12; i < values.length; i += 1) {
    if (String(values[i][0]) !== String(fileKey)) {
      continue;
    }

    return {
      fileKey: values[i][0],
      fileName: values[i][1],
      filePath: values[i][2],
      hunkHeader: values[i][3],
      additions: values[i][4],
      deletions: values[i][5],
      diffText: values[i][7] || ''
    };
  }

  throw new Error('該当する差分詳細が見つかりません。');
}

function ensureWorkbookSheets_() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var diffSheet = spreadsheet.getSheetByName(DIFF_LIST_SHEET);
  if (!diffSheet) {
    diffSheet = spreadsheet.insertSheet(DIFF_LIST_SHEET, 0);
    formatDiffListSheet_(diffSheet, 0);
  }

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
    reviewerSheet.getRange(2, 1, 3, 1).setValues([
      ['reviewer1@example.com'],
      ['reviewer2@example.com'],
      ['reviewer3@example.com']
    ]]);
    formatReviewerMasterSheet_(reviewerSheet);
  }
  var metaSheet = spreadsheet.getSheetByName(META_SHEET);
  if (!metaSheet) {
    metaSheet = spreadsheet.insertSheet(META_SHEET);
    formatMetaSheet_(metaSheet, 0);
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

function saveDiffFileToDrive_(folder, fileName, diffText) {
  var safeName = fileName || 'uploaded.diff';
  var suffix = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss');
  var fullName = safeName.replace(/\.diff$|\.patch$/i, '') + '_' + suffix + '.diff';
  return folder.createFile(fullName, diffText, MimeType.PLAIN_TEXT);
}

function populateDiffListSheet_(sheet, diffUnits, spreadsheetId) {
  sheet.clear();
  sheet.getRange(1, 1, 1, 7).setValues([['No', 'ファイル名', 'パス', '差分見出し', '案件', '確認者', '差分']]);

  var rows = diffUnits.map(function(unit) {
    return [
      unit.no,
      unit.fileName,
      unit.filePath,
      unit.hunkHeader,
      '',
      '',
      unit.detailUrl ? '差分を開く' : '詳細URL未設定'
    ];
  });
  if (rows.length) {
    sheet.getRange(2, 1, rows.length, 7).setValues(rows);
  }

  for (var i = 0; i < diffUnits.length; i += 1) {
    if (!diffUnits[i].detailUrl) {
      continue;
    }
    var rich = SpreadsheetApp.newRichTextValue()
      .setText('差分を開く')
      .setLinkUrl(diffUnits[i].detailUrl)
      .build();
    sheet.getRange(i + 2, 7).setRichTextValue(rich);
  }

  formatDiffListSheet_(sheet, rows.length);
}

function applyDropdownValidations_(sheet, projectSheet, reviewerSheet, rowCount) {
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

  sheet.getRange(2, 5, rowCount, 1).setDataValidation(projectValidation);
  sheet.getRange(2, 6, rowCount, 1).setDataValidation(reviewerValidation);
}

function populateMetaSheet_(sheet, summary, diffUnits) {
  sheet.clear();
  var metadataRows = [
    ['元diffファイル名', summary.diffFileName],
    ['元diffファイルURL', summary.diffFileUrl],
    ['親スプレッドシートURL', summary.spreadsheetUrl],
    ['取込日時', summary.importedAt],
    ['取込者', summary.importedBy],
    ['差分単位数', summary.totalUnits],
    ['対象ファイル数', summary.totalFiles],
    ['総追加行数', summary.totalAdditions],
    ['総削除行数', summary.totalDeletions],
    ['詳細表示URL基底', ScriptApp.getService().getUrl() || '未デプロイ'],
    ['', ''],
    ['DiffKey', 'ファイル名', 'パス', '差分見出し', '追加行数', '削除行数', '詳細URL', 'DiffText']
  ];

  sheet.getRange(1, 1, metadataRows.length, 8).setValues(padRows_(metadataRows, 8));

  if (diffUnits.length) {
    var detailRows = diffUnits.map(function(unit) {
      return [
        unit.fileKey,
        unit.fileName,
        unit.filePath,
        unit.hunkHeader,
        unit.additions,
        unit.deletions,
        unit.detailUrl,
        unit.diffText
      ];
    });
    sheet.getRange(13, 1, detailRows.length, 8).setValues(detailRows);
  }

  formatMetaSheet_(sheet, diffUnits.length);
}

function formatDiffListSheet_(sheet, rowCount) {
  sheet.setFrozenRows(1);
  if (sheet.getFilter()) {
    sheet.getFilter().remove();
  }
  sheet.getRange(1, 1, 1, 7)
    .setBackground('#1f4e78')
    .setFontColor('#ffffff')
    .setFontWeight('bold');
  if (rowCount > 0) {
    sheet.getRange(1, 1, rowCount + 1, 7).createFilter();
    sheet.getRange(2, 7, rowCount, 1)
      .setFontColor('#0969da')
      .setFontWeight('bold');
  }
  sheet.setColumnWidths(1, 1, 60);
  sheet.setColumnWidths(2, 1, 220);
  sheet.setColumnWidths(3, 1, 360);
  sheet.setColumnWidths(4, 1, 240);
  sheet.setColumnWidths(5, 1, 180);
  sheet.setColumnWidths(6, 1, 180);
  sheet.setColumnWidths(7, 1, 120);
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

function formatMetaSheet_(sheet, detailRowCount) {
  sheet.getRange(1, 1, 10, 1).setBackground('#f3f6fa').setFontWeight('bold');
  sheet.getRange(12, 1, 1, 8).setBackground('#7f6000').setFontColor('#ffffff').setFontWeight('bold');
  sheet.setColumnWidths(1, 1, 180);
  sheet.setColumnWidths(2, 1, 220);
  sheet.setColumnWidths(3, 1, 360);
  sheet.setColumnWidth(4, 260);
  sheet.setColumnWidths(5, 2, 110);
  sheet.setColumnWidth(7, 240);
  sheet.setColumnWidth(8, 360);
  if (detailRowCount > 0) {
    sheet.hideColumns(8);
  }
  sheet.hideSheet();
}

function validateCreatePayload_(payload) {
  if (!payload) {
    throw new Error('payload is required.');
  }
  if (!payload.diffText || !String(payload.diffText).trim()) {
    throw new Error('diffText is required.');
  }
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

function buildDetailUrl_(spreadsheetId, fileKey) {
  var baseUrl = ScriptApp.getService().getUrl();
  if (!baseUrl) {
    return '';
  }
  return baseUrl + '?view=detail&spreadsheetId=' + encodeURIComponent(spreadsheetId) + '&fileKey=' + encodeURIComponent(fileKey);
}

function normalizeNewlines_(text) {
  return String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function padRows_(rows, width) {
  return rows.map(function(row) {
    var padded = row.slice();
    while (padded.length < width) {
      padded.push('');
    }
    return padded;
  });
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