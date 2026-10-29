/**
 * 2026 Party 신청서 수신용 Google Apps Script
 * 신청 내용을 받을 Google Sheet 에서 [확장 프로그램] → [Apps Script] 를 열고 이 코드를 붙여넣으세요.
 *
 * ── 받는 파라미터 (index.html 폼의 name 값) ───────────────────────
 *  date        참여일      필수   1114 / 1121 / both (아래 DATES 의 키)
 *  name        이름        필수   30자
 *  phone       연락처      필수   30자
 *  age         나이        필수   숫자 19–99
 *  depositor   입금자명    필수   30자
 *  memo        코멘트      선택   2000자 (요청사항·제안을 한 칸에서 받습니다)
 *  website     봇 방지용 숨김 필드 — 값이 있으면 저장하지 않음
 *
 * 참가비 열은 폼에서 받지 않고 참여일로 계산해서 적습니다 (파티 1회 PRICE 원).
 * 열 순서를 바꾸면 HEADERS 와 appendRow 를 나란히 고치세요.
 * 시트의 첫 줄이 HEADERS 와 다르면 다음 신청이 들어올 때 첫 줄을 HEADERS 로 고쳐 씁니다.
 */

// 신청 내용을 적을 스프레드시트 ID.
// 시트 주소 https://docs.google.com/spreadsheets/d/<이 부분>/edit 에서 가져와
// Apps Script 편집기에 붙여넣은 코드에만 채워 넣으세요. 이 저장소는 공개라서 비워 둡니다.
const SPREADSHEET_ID = "여기에_스프레드시트_ID";
const SHEET_NAME = "신청";
const VERSION = 2;

const PRICE = 50000; // 파티 1회 1인
const DATES = {
  "1114": { label: "11/14 (토)", count: 1 },
  "1121": { label: "11/21 (토)", count: 1 },
  "both": { label: "양일 (14·21)", count: 2 },
};

const HEADERS = [
  "접수시각", "참여일", "이름", "연락처", "나이", "입금자명", "참가비", "코멘트",
];
const COL_FEE = 7;
const COL_MEMO = 8;

function doPost(e) {
  const p = (e && e.parameter) || {};

  // 숨김 필드에 값이 있으면 봇으로 보고 저장하지 않음 (응답은 성공처럼)
  if (p.website) return json_({ result: "success" });

  const date = Object.prototype.hasOwnProperty.call(DATES, p.date) ? DATES[p.date] : null;
  if (!date) {
    return json_({ result: "error", message: "참여일 값이 올바르지 않습니다" });
  }

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
      date.label,
      clean_(p.name, 30),
      clean_(p.phone, 30),
      age,
      clean_(p.depositor, 30),
      PRICE * date.count,
      clean_(p.memo, 2000),
    ]);
    return json_({ result: "success", v: VERSION });
  } catch (err) {
    return json_({ result: "error", message: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// 브라우저로 URL 을 직접 열었을 때 동작 확인용 (v 로 어느 버전이 배포됐는지 확인)
function doGet() {
  return json_({ result: "ok", message: "2026 Party form endpoint", v: VERSION });
}

function getSheet_() {
  // ID 로 열기 때문에 시트에 붙지 않은 독립 스크립트에서도 동작합니다
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);

  const head = sheet.getLastRow() === 0
    ? []
    : sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  if (head.join("|") !== HEADERS.join("|")) writeHeaders_(sheet);
  return sheet;
}

// 첫 줄을 HEADERS 로 맞추고 서식을 다시 잡는다 (처음 만들 때, 열 구성이 바뀌었을 때)
function writeHeaders_(sheet) {
  const width = Math.max(sheet.getLastColumn(), HEADERS.length);
  if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);
  else {
    sheet.getRange(1, 1, 1, width).clearContent().clearDataValidations();
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  }
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, width).setFontWeight("normal");
  sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");

  // 예전 열 구성에서 남은 서식(줄바꿈, 체크박스)을 지우고 새로 건다
  const rows = sheet.getMaxRows();
  sheet.getRange(1, 1, rows, width).setWrap(false);
  if (rows > 1) {
    sheet.getRange(2, 1, rows - 1, width).clearDataValidations();
    // 참가비는 천 단위 쉼표
    sheet.getRange(2, COL_FEE, rows - 1, 1).setNumberFormat("#,##0");
  }
  // 긴 글이 들어가는 코멘트 칸은 줄바꿈해서 넓게
  sheet.getRange(1, COL_MEMO, rows, 1).setWrap(true);
  sheet.setColumnWidth(COL_MEMO, 460);
}

// 길이 제한 + 수식 주입 방지 (= + - @ 로 시작하는 값이 수식으로 실행되지 않게)
function clean_(v, maxLen) {
  const s = String(v || "").trim().slice(0, maxLen || 500);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
