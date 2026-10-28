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

## 폼 파라미터

폼의 `name` 값이 그대로 Apps Script 로 넘어가 시트 열이 됩니다. **이름과 순서를 바꾸면 기존 데이터와 어긋나니**, 항목을 추가할 때는 `index.html` 의 폼과 `Code.gs` 의 `HEADERS` / `appendRow` 끝에 나란히 덧붙이세요.

| 파라미터 | 시트 열 | 필수 | 제한 |
|---|---|---|---|
| — | 접수시각 | 자동 | 서버 시각 |
| `name` | 이름 | 필수 | 30자 |
| `phone` | 연락처 | 필수 | 30자 |
| `age` | 나이 | 필수 | 숫자 19–99 |
| `depositor` | 입금자명 | 필수 | 30자 |
| `memo` | 코멘트 | 선택 | 2,000자 |
| — | 입금확인 | 수동 | 체크박스 |

요청사항과 제안을 한 칸에서 받습니다. 화면에 보이는 라벨(`하고 싶은 말`)은 `index.html` 에서 자유롭게 바꿔도 되지만, `name="memo"` 와 시트의 열 순서는 그대로 두세요.

`website`는 봇 방지용 숨김 필드라 값이 있으면 저장하지 않습니다.

Google Sheets 셀은 한 칸에 5만 자까지 들어가므로 2,000자는 넉넉합니다. 더 길게 받고 싶으면 `index.html` 의 `maxlength` 와 `Code.gs` 의 `clean_(p.memo, 2000)` 숫자를 같이 올리면 됩니다.

## 2. 내용 수정

`index.html`에서 대괄호로 표시된 자리를 실제 내용으로 바꾸세요.

- `[장소 이름]`, `[주소를 넣어주세요]`, `[OO역]`
- `[은행명] 000-0000-0000`, 예금주 `[이름]`
- `[010-0000-0000]`
- 날짜, 시간, 참가비, 프로그램 시간표

## 디자인

- **MIDNIGHT** — 검정 바탕(`#0B0B0B`)에 흰 글자, 포인트는 주황(`#FF3B00`).
  색은 `:root`의 CSS 변수로만 정의돼 있어서 거기만 고치면 전체가 따라 바뀝니다.
- 모바일 우선. 390px 기준으로 잡고 넓어지면 여백과 자간만 커집니다.
- 폰트는 Google Fonts의 Archivo(라틴) + Noto Sans KR(한글).
- 인터랙션은 GSAP + ScrollTrigger (cdnjs에서 로드):
  스크램블 텍스트, 스크롤 리빌, 마키, 회전 배지, 푸터 패럴랙스.
  `prefers-reduced-motion`이 켜져 있으면 모두 꺼집니다.
  GSAP이 로드되지 않아도 페이지는 정상적으로 보입니다.
- 히어로 배경은 `assets/hero.mp4` 가 반복 재생됩니다 (아래 참고).

## 3. 배포 (무료 정적 호스팅)

- **Netlify Drop**: https://app.netlify.com/drop 에 `party-2026` 폴더를 드래그하면 끝
- **GitHub Pages**: 저장소에 올리고 Settings → Pages에서 활성화
- **Vercel / Cloudflare Pages**도 가능

## 참고

- 웹앱 URL은 공개되는 값이라 누구나 POST를 보낼 수 있습니다. 숨김 필드(honeypot)로 단순한 봇은 걸러지지만, 장난 신청이 많아지면 Google reCAPTCHA를 추가하는 걸 권합니다.
- 시트에 수식이 실행되지 않도록 `=`, `+`, `-`, `@`로 시작하는 입력값 앞에는 `'`를 붙여 저장합니다.

## 히어로 배경 영상

`assets/hero.mp4` 가 히어로 블록 배경에서 소리 없이 반복 재생됩니다 (720×900, 6.8초, 약 1.9MB).
재생이 시작되면 `.stage` 에 `has-vid` 가 붙어 글자가 흰색으로 바뀌고 어두운 막이 깔립니다.
파일이 없거나 브라우저가 자동재생을 막으면 원래의 그라데이션이 그대로 보이므로, 영상을 지워도 페이지는 멀쩡합니다.

영상을 바꿀 때 조건:

- **형식** H.264 MP4 (`-c:v libx264 -pix_fmt yuv420p -movflags +faststart`). 아이폰까지 재생되는 조합입니다
- **길이** 6~10초
- **크기** 720×900 (세로 4:5). 더 키워도 화면에서 잘립니다
- **용량** 2~4MB 를 넘기지 마세요. 모바일 데이터로 들어오는 사람이 대부분입니다
- **소리** 없어도 됩니다 (`-an`). 어차피 음소거로 재생합니다
- **밝기** 어두운 편이 좋습니다. 위에 흰 글자가 올라갑니다

가로 원본을 세로로 자르고, 끝과 처음을 0.8초 겹쳐 이음매 없이 도는 클립으로 만드는 예시입니다
(`D` 는 원본 길이, 아래는 7.64초 기준):

```bash
ffmpeg -i 원본.mp4 -filter_complex "
[0:v]crop=864:1080:528:0,scale=720:900,setsar=1,fps=25[v];
[v]split=3[a][b][c];
[a]trim=0.8:6.84,setpts=PTS-STARTPTS[mid];
[b]trim=6.84:7.64,setpts=PTS-STARTPTS[tail];
[c]trim=0:0.8,setpts=PTS-STARTPTS[head];
[tail][head]blend=all_expr='A*(1-(T/0.8))+B*(T/0.8)'[seam];
[mid][seam]concat=n=2:v=1:a=0[out]" -map "[out]" \
  -c:v libx264 -crf 25 -preset slow -pix_fmt yuv420p -movflags +faststart -an \
  assets/hero.mp4
```

그냥 잘라 쓰기만 할 거라면 이걸로 충분합니다:

```bash
ffmpeg -i 원본.mp4 -t 8 -vf "crop=864:1080:528:0,scale=720:900" \
  -c:v libx264 -crf 25 -preset slow -pix_fmt yuv420p -movflags +faststart -an \
  assets/hero.mp4
```

자동재생은 **음소거일 때만** 허용됩니다. 아이폰 저전력 모드나 안드로이드 데이터 절약 모드에서는 막힐 수 있는데, 그때는 그라데이션으로 돌아갑니다. 모션 최소화 설정을 켠 분에게는 아예 재생하지 않습니다.
