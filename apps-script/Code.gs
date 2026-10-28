/**
 * 2026 Party 신청서 수신용 Google Apps Script
 * 신청 내용을 받을 Google Sheet 에서 [확장 프로그램] → [Apps Script] 를 열고 이 코드를 붙여넣으세요.
 *
 * ── 받는 파라미터 (index.html 폼의 name 값) ───────────────────────
 *  name        이름        필수   30자
 *  phone       연락처      필수   30자
 *  age         나이        필수   숫자 19–99
 *  email       이메일      선택   80자
 *  count       참가 인원   필수   숫자 1–4
 *  depositor   입금자명    필수   30자
 *  memo        하고 싶은 말 선택   500자
 *  suggestion  제안 의견   선택   2000자
 *  agree       동의 여부   필수   (페이지에서만 확인, 시트에는 저장하지 않음)
 *  website     봇 방지용 숨김 필드 — 값이 있으면 저장하지 않음
 *
 * 폼의 name 값과 아래 HEADERS 순서를 바꾸면 기존 데이터와 열이 어긋납니다.
 * 항목을 추가할 때는 HEADERS 와 appendRow 끝에 나란히 덧붙이세요.
 */

const SHEET_NAME = "신청";
const HEADERS = [
  "접수시각", "이름", "연락처", "나이", "이메일",
  "인원", "입금자명", "하고 싶은 말", "제안 의견", "입금확인",
];

function doPost(e) {
  const p = (e && e.parameter) || {};

  // 숨김 필드에 값이 있으면 봇으로 보고 저장하지 않음 (응답은 성공처럼)
  if (p.website) return json_({ result: "success" });

  if (!p.name || !p.phone || !p.depositor || !p.age) {
    return json_({ result: "error", message: "필수 항목 누락" });
  }

  const age = Number(p.age);
  if (!age || age < 19 || age > 99) {
    return json_({ result: "error", message: "나이 값이 올바르지 않습니다" });
  }

  // 동시에 여러 명이 제출해도 행이 꼬이지 않도록 잠금
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getSheet_();
    sheet.appendRow([
      new Date(),
      clean_(p.name, 30),
      clean_(p.phone, 30),
      age,
      clean_(p.email, 80),
      Math.min(Math.max(Number(p.count) || 1, 1), 4),
      clean_(p.depositor, 30),
      clean_(p.memo, 500),
      clean_(p.suggestion, 2000),
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
    // 긴 글이 들어가는 두 칸은 줄바꿈해서 보이게
    sheet.getRange("H:I").setWrap(true);
    sheet.setColumnWidth(8, 260);
    sheet.setColumnWidth(9, 420);
  }
  return sheet;
}

// 길이 제한 + 수식 주입 방지 (= + - @ 로 시작하는 값이 수식으로 실행되지 않게)
function clean_(v, maxLen) {
  const s = String(v || "").trim().slice(0, maxLen || 500);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
