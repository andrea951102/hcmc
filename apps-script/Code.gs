/**
 * 2026 Party 신청서 수신용 Google Apps Script
 * 신청 내용을 받을 Google Sheet 에서 [확장 프로그램] → [Apps Script] 를 열고 이 코드를 붙여넣으세요.
 */

const SHEET_NAME = "신청";
const HEADERS = ["접수시각", "이름", "연락처", "이메일", "인원", "입금자명", "요청사항", "입금확인"];

function doPost(e) {
  const p = (e && e.parameter) || {};

  // 숨김 필드에 값이 있으면 봇으로 보고 저장하지 않음 (응답은 성공처럼)
  if (p.website) return json_({ result: "success" });

  if (!p.name || !p.phone || !p.depositor) {
    return json_({ result: "error", message: "필수 항목 누락" });
  }

  // 동시에 여러 명이 제출해도 행이 꼬이지 않도록 잠금
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getSheet_();
    sheet.appendRow([
      new Date(),
      clean_(p.name),
      clean_(p.phone),
      clean_(p.email),
      Number(p.count) || 1,
      clean_(p.depositor),
      clean_(p.memo),
      false,
    ]);
    // 입금확인 칸을 체크박스로
    sheet.getRange(sheet.getLastRow(), HEADERS.length).insertCheckboxes();
    return json_({ result: "success" });
  } catch (err) {
    return json_({ result: "error", message: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// 브라우저로 URL 을 직접 열었을 때 동작 확인용
function doGet() {
  return json_({ result: "ok", message: "2026 Party form endpoint" });
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
  }
  return sheet;
}

// 길이 제한 + 수식 주입 방지 (= + - @ 로 시작하는 값이 수식으로 실행되지 않게)
function clean_(v) {
  const s = String(v || "").trim().slice(0, 500);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
