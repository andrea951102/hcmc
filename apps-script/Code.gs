/**
 * 2026 Party 신청서 수신용 Google Apps Script
 * 신청 내용을 받을 Google Sheet 에서 [확장 프로그램] → [Apps Script] 를 열고 이 코드를 붙여넣으세요.
 *
 * ── 받는 파라미터 (index.html 폼의 name 값) ───────────────────────
 *  date        참여일      필수   1114 / 1121 / both (아래 DATES 의 키)
 *  name        이름        필수   30자
 *  gender      성별        필수   M / F (아래 GENDERS 의 키)
 *  phone       연락처      필수   30자
 *  age         나이        필수   숫자 19–99
 *  depositor   입금자명    필수   30자
 *  memo        코멘트      선택   2000자 (요청사항·제안을 한 칸에서 받습니다)
 *  website     봇 방지용 숨김 필드 — 값이 있으면 저장하지 않음
 *
 * 참가비 열은 폼에서 받지 않고 참여일로 계산해서 적습니다 (파티 1회 PRICE 원).
 * 정원은 날짜·성별마다 CAP 명. 양일 신청자는 두 날짜에서 한 자리씩 차지합니다.
 * 페이지는 열릴 때 doGet 으로 남은 자리를 받아 마감된 선택지를 막고,
 * doPost 는 저장 직전에 다시 세어서 정원을 넘는 신청을 거절합니다.
 * 시트에서 행을 지우면(취소) 그 자리는 바로 다시 열립니다.
 * 열 순서를 바꾸면 HEADERS 와 appendRow 를 나란히 고치세요.
 * 시트의 첫 줄이 HEADERS 와 다르면 다음 신청이 들어올 때 첫 줄을 HEADERS 로 고쳐 씁니다.
 */

// 신청 내용을 적을 스프레드시트 ID.
// 시트 주소 https://docs.google.com/spreadsheets/d/<이 부분>/edit 에서 가져와
// Apps Script 편집기에 붙여넣은 코드에만 채워 넣으세요. 이 저장소는 공개라서 비워 둡니다.
const SPREADSHEET_ID = "여기에_스프레드시트_ID";
const SHEET_NAME = "신청";
const VERSION = 5;

const PRICE = 50000; // 파티 1회 1인
const DAYS = ["1114", "1121"];
const DATES = {
  "1114": { label: "11/14 (토)", days: ["1114"] },
  "1121": { label: "11/21 (토)", days: ["1121"] },
  "both": { label: "양일 (14·21)", days: ["1114", "1121"] },
};

const GENDERS = { "M": "남", "F": "여" };
const CAP = { "M": 8, "F": 8 }; // 날짜마다 성별 정원

const HEADERS = [
  "접수시각", "참여일", "이름", "성별", "연락처", "나이", "입금자명", "참가비", "코멘트",
];
const COL_FEE = 8;
const COL_MEMO = 9;

function doPost(e) {
  const p = (e && e.parameter) || {};

  // 숨김 필드에 값이 있으면 봇으로 보고 저장하지 않음 (응답은 성공처럼)
  if (p.website) return json_({ result: "success" });

  const date = Object.prototype.hasOwnProperty.call(DATES, p.date) ? DATES[p.date] : null;
  if (!date) {
    return json_({ result: "error", message: "참여일 값이 올바르지 않습니다" });
  }

  const gender = Object.prototype.hasOwnProperty.call(GENDERS, p.gender) ? GENDERS[p.gender] : null;
  if (!gender) {
    return json_({ result: "error", message: "성별 값이 올바르지 않습니다" });
  }

  if (!p.name || !p.phone || !p.depositor || !p.age) {
    return json_({ result: "error", message: "필수 항목 누락" });
  }

  const age = Number(p.age);
  if (!age || age < 19 || age > 99) {
    return json_({ result: "error", message: "나이 값이 올바르지 않습니다" });
  }

  // 동시에 여러 명이 제출해도 행이 꼬이거나 정원을 넘지 않도록 잠금
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getSheet_();
    const counts = countSeats_(sheet);
    const full = date.days.filter(function (d) { return counts[d][p.gender] >= CAP[p.gender]; });
    if (full.length) {
      return json_({ result: "full", message: "마감되었습니다", full: full, counts: counts, cap: CAP, v: VERSION });
    }
    sheet.appendRow([
      new Date(),
      date.label,
      clean_(p.name, 30),
      gender,
      phone_(p.phone),
      age,
      clean_(p.depositor, 30),
      PRICE * date.days.length,
      clean_(p.memo, 2000),
    ]);
    return json_({ result: "success", v: VERSION });
  } catch (err) {
    return json_({ result: "error", message: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// 페이지가 열릴 때 남은 자리를 물어보는 곳. 개인정보 없이 숫자만 돌려준다.
// 브라우저로 URL 을 직접 열어 v 로 어느 버전이 배포됐는지도 확인할 수 있다.
function doGet() {
  const counts = countSeats_(getSheet_());
  return json_({ result: "ok", message: "2026 Party form endpoint", v: VERSION, cap: CAP, counts: counts });
}

// 날짜·성별별 신청 인원. 참여일·성별 칸이 알아볼 수 없는 행(예전 형식 등)은 세지 않는다.
function countSeats_(sheet) {
  const counts = {};
  DAYS.forEach(function (d) { counts[d] = { "M": 0, "F": 0 }; });
  const byLabel = Object.create(null);
  Object.keys(DATES).forEach(function (k) { byLabel[DATES[k].label] = DATES[k].days; });
  const byGender = Object.create(null);
  Object.keys(GENDERS).forEach(function (k) { byGender[GENDERS[k]] = k; });

  const last = sheet.getLastRow();
  if (last < 2) return counts;
  const rows = sheet.getRange(2, 2, last - 1, 3).getValues(); // 참여일, 이름, 성별
  rows.forEach(function (r) {
    const days = byLabel[String(r[0]).trim()];
    const g = byGender[String(r[2]).trim()];
    if (!days || !g) return;
    days.forEach(function (d) { counts[d][g]++; });
  });
  return counts;
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

// 연락처는 010-1234-5678 꼴로 맞춰 글자로 저장한다.
// 하이픈 없이 01012345678 로 넣으면 시트가 숫자로 바꿔 앞의 0 을 지워 버리기 때문.
function phone_(v) {
  const d = String(v || "").replace(/\D/g, "");
  if (/^01\d{8,9}$/.test(d)) return d.replace(/^(\d{3})(\d{3,4})(\d{4})$/, "$1-$2-$3");
  const s = clean_(v, 30);
  return s.charAt(0) === "'" ? s : "'" + s; // 그 밖의 번호도 글자로 고정
}

// 길이 제한 + 수식 주입 방지 (= + - @ 로 시작하는 값이 수식으로 실행되지 않게)
function clean_(v, maxLen) {
  const s = String(v || "").trim().slice(0, maxLen || 500);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
