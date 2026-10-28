# 2026 Party 모집 페이지

정적 페이지(`index.html`) 하나와 Google Apps Script(`apps-script/Code.gs`)로 동작합니다. 서버나 DB는 없습니다.

```
[index.html 폼] --POST--> [Apps Script 웹앱] --appendRow--> [Google Sheet]
```

## 1. Google Sheet + Apps Script 연결 (5분)

1. Google Drive에서 새 스프레드시트를 만듭니다 (예: `2026 Party 신청자`).
2. 메뉴 **확장 프로그램 → Apps Script**를 엽니다.
3. 기본 `Code.gs` 내용을 지우고 `apps-script/Code.gs` 내용을 붙여넣은 뒤 저장합니다.
4. 오른쪽 위 **배포 → 새 배포**를 누릅니다.
   - 유형 선택(톱니바퀴): **웹 앱**
   - 다음 사용자 인증 정보로 실행: **나**
   - 액세스 권한이 있는 사용자: **모든 사용자**
5. **배포**를 누르고 권한을 승인합니다. ("확인되지 않은 앱" 경고가 나오면 고급 → 이동을 누르면 됩니다. 본인이 만든 스크립트라서 나오는 경고입니다.)
6. 나온 **웹 앱 URL**(`https://script.google.com/macros/s/.../exec`)을 복사합니다.
7. `index.html` 아래쪽 `SCRIPT_URL` 값을 그 URL로 바꿉니다.

첫 신청이 들어오면 `신청` 시트와 헤더가 자동으로 생깁니다. `입금확인` 칸은 체크박스라서 입금을 확인하면 직접 체크하면 됩니다.

> `Code.gs`를 수정했다면 **배포 → 배포 관리 → 편집(연필) → 버전: 새 버전**으로 다시 배포해야 반영됩니다. URL은 그대로 유지됩니다.

## 2. 내용 수정

`index.html`에서 아래 항목을 실제 내용으로 바꾸세요.

- 히어로 배지: 날짜, 모집 인원
- 소개 문구, 카드 3개
- 프로그램 시간표
- 일시, 장소, 지도 링크, 참가비, **입금계좌/예금주**, 문의처

## 3. 배포 (무료 정적 호스팅)

- **Netlify Drop**: https://app.netlify.com/drop 에 `party-2026` 폴더를 드래그하면 끝
- **GitHub Pages**: 저장소에 올리고 Settings → Pages에서 활성화
- **Vercel / Cloudflare Pages**도 가능

## 참고

- 웹앱 URL은 공개되는 값이라 누구나 POST를 보낼 수 있습니다. 숨김 필드(honeypot)로 단순한 봇은 걸러지지만, 장난 신청이 많아지면 Google reCAPTCHA를 추가하는 걸 권합니다.
- 시트에 수식이 실행되지 않도록 `=`, `+`, `-`, `@`로 시작하는 입력값 앞에는 `'`를 붙여 저장합니다.
