/**
 * 機能確認チェック — ライブ共有バックエンド（Google Apps Script）
 * requirements_v3.0.html 第2章「確認」列の状態を Google スプレッドシートに保存・共有する。
 *
 * これを使うと、各自がページ上で名前を入力してチェックした内容が即座に全員へ共有される。
 * （endpoint を設定しない場合、チェックは各端末の localStorage に保存され共有はされない）
 *
 * ── セットアップ手順 ──────────────────────────────────────────────
 * 1. Google スプレッドシートを新規作成（シート名は「checks」にする）。
 * 2. 拡張機能 → Apps Script を開き、このコードを全文貼り付けて保存。
 * 3. デプロイ → 新しいデプロイ → 種類「ウェブアプリ」。
 *      - 実行ユーザー：自分
 *      - アクセスできるユーザー：全員（リンクを知っている全員）
 * 4. 発行された Web アプリ URL（…/exec）をコピー。
 * 5. requirements_v3.0.html の CHK_CFG.endpoint にその URL を貼り付けてコミット。
 * これで GET=取得 / POST=保存 がライブで動作する。
 *
 * シート列: A=key, B=checked(TRUE/FALSE), C=by(氏名), D=at(ISO日時)
 * ──────────────────────────────────────────────────────────────────
 */

var SHEET_NAME = 'checks';

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(['key', 'checked', 'by', 'at']);
  }
  return sh;
}

function readAll_() {
  var sh = getSheet_();
  var values = sh.getDataRange().getValues();
  var checks = {};
  for (var i = 1; i < values.length; i++) {
    var key = values[i][0];
    if (!key) continue;
    checks[key] = { checked: values[i][1] === true || values[i][1] === 'TRUE', by: values[i][2] || '', at: values[i][3] || '' };
  }
  return checks;
}

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ checks: readAll_() }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var body = JSON.parse(e.postData.contents || '{}');
    var incoming = body.checks || {};
    var sh = getSheet_();
    var values = sh.getDataRange().getValues();
    var rowOf = {};
    for (var i = 1; i < values.length; i++) { if (values[i][0]) rowOf[values[i][0]] = i + 1; }

    Object.keys(incoming).forEach(function (key) {
      var c = incoming[key];
      var row = [key, !!c.checked, c.by || '', c.at || ''];
      if (rowOf[key]) {
        sh.getRange(rowOf[key], 1, 1, 4).setValues([row]);
      } else {
        sh.appendRow(row);
        rowOf[key] = sh.getLastRow();
      }
    });

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, checks: readAll_() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
