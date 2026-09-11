# NHPLUG 실시간 보유자산 연동

## 목적

나무증권(Namuh)의 공식 NHPLUG Open API를 사용해 Alpha Map과 ChatGPT가 같은 최신 계좌 데이터를 참조한다.

- 운영 계좌 조회만 사용한다.
- 주문/매수/매도 API는 구현하지 않는다.
- 계좌번호·고객식별자·App Key/Secret·access token은 외부 응답/스냅샷에서 제거 또는 마스킹한다.
- 기존 `holdings.json`/자산현황 Excel은 장애 시 fallback 및 장기 기준자료로 유지한다.
- NHPLUG가 직접 제공하지 못하거나 일반 주식 잔고 API가 비어 있는 연금계좌는 사용자 확정 캡처 또는 최신 자산원장을 수동 스냅샷으로 병합한다.

## 데이터 흐름

```text
Namuh 계좌
  -> NHPLUG REST
  -> Cloudflare Worker /api/portfolio/live
       ├─ NHPLUG 실시간 종합매매/지원 계좌
       ├─ manual-portfolio.js 개인형IRP 수동 스냅샷
       └─ manual-portfolio.js DC 수동 스냅샷
  -> R2 암호화 access-token cache
  -> portfolio-live branch / portfolio-live.json (5분 스냅샷)
  -> ChatGPT / 운영 분석
```

## 필요한 GitHub Secrets

Repository Settings > Secrets and variables > Actions에 다음 두 값을 등록한다.

- `NHPLUG_APP_KEY`
- `NHPLUG_APP_SECRET`

`Sync NHPLUG Worker secrets` workflow가 이 두 값을 Cloudflare Worker secret으로 복사한다. App Key/Secret은 코드, `holdings.json`, 스냅샷, 로그에 기록하지 않는다.

## Worker API

`GET https://simpleornothing.com/api/portfolio/live`

인증은 둘 중 하나다.

1. Alpha Map 로그인 쿠키가 있는 브라우저 요청
2. 자동화용 `x-portfolio-api-token` 헤더

자동화용 토큰은 App Secret 자체가 아니라 아래 값이다.

```text
SHA256("alpha-map:portfolio-read:v1:" + NHPLUG_APP_SECRET)
```

이 토큰은 조회 권한만 주며 주문 기능은 존재하지 않는다.

## NH access token 캐시

NHPLUG access token은 24시간 재사용한다. Worker 메모리 캐시 뒤에 Cloudflare R2를 공유 캐시로 사용한다.

- 저장 위치: `_private/nhplug/token-v1.json`
- AES-GCM 암호화 후 저장
- 암호화 키는 `NHPLUG_APP_SECRET`에서 SHA-256으로 파생
- 만료 60초 전부터 새 토큰 발급
- 401/IGW40043일 때만 캐시 삭제 후 1회 재발급
- 429 등 일반 오류에는 토큰을 재발급하지 않는다

## 조회 범위

현재 구현:

- 계좌 목록: `/n2/acctinfo`
- 국내주식 잔고: `/krstock/inquiry/v1/balance`
- 해외주식 잔고: `/gbstock/inquiry/v1/balance`
- 해외 기본 국가: 미국(`200`)

추가 국가가 필요하면 Worker 변수 `NHPLUG_OVERSEAS_NATIONS`에 쉼표로 국가코드를 지정한다.

### 계좌유형 처리

1. `/n2/acctinfo`가 반환한 모든 계좌를 `discovery`에 보존한다.
2. 계좌번호는 뒤 4자리만 남겨 마스킹한다.
3. 운영 환경에서 일반 주식 잔고 API 호출은 현재 사용 중인 `01/02` 계좌유형에만 수행한다.
4. 그 외 유형은 `account-listed-stock-balance-not-eligible` 상태로 남긴다.
5. 계좌가 목록에는 있지만 일반 주식 잔고 API가 비어 있거나 실패한 경우 수동 스냅샷이 있으면 이를 사용한다.

2026-09-12 실제 운영 호출 결과:

- 종합매매: `/n2/acctinfo` 노출 및 일반 주식 잔고 조회 정상
- 개인형IRP: `/n2/acctinfo`에는 노출되지만 국내·해외 일반 주식 잔고 API가 모두 0/빈 보유내역 반환
- DC: `/n2/acctinfo` 자체에 미노출

따라서 현재는 종합매매만 NHPLUG 실시간 잔고를 신뢰하고, 개인형IRP와 DC는 사용자 캡처 수동 스냅샷을 사용한다.

## 연금계좌 수동 스냅샷

`manual-portfolio.js`는 NHPLUG가 정확히 제공하지 못하는 개인형IRP/DC를 위한 fallback이다.

### 개인형IRP

- 기준일: 2026-09-12
- 출처: 사용자 제공 나무증권 개인형IRP 잔고 캡처 1장
- 보유 ETF: 4개
- 보유종목 평가금액 합계: 4,811,610원
- 현금/예수금: 캡처에서 확인되지 않음

### DC

- 기준일: 2026-09-12
- 출처: 사용자 제공 나무증권 DC 잔고 캡처 2장
- 보유 ETF: 9개
- 보유종목 평가금액 합계: 431,206,120원
- 현금/예수금: 캡처에서 확인되지 않음

현금이 보이지 않는 캡처에서는 과거 현금값을 임의 이월하지 않는다. 이 경우 `tot_evlu_amt`에는 확인된 보유종목 평가금액 합계만 저장하고, 현금은 `cash_status=not-visible-in-source-capture`로 명시한다.

운영 원칙:

1. 사용자가 나무증권 연금계좌 캡처 이미지를 업로드한다.
2. 이미지에서 종목명·수량·현재가·평가금액·평가손익·수익률·현금을 확인한다.
3. 화면에서 확인 가능한 항목끼리 합계를 재검산한다.
4. 확인된 값만 `manual-portfolio.js`에 반영한다. 확인할 수 없는 항목은 추정하거나 직전 값을 이월하지 않는다.
5. 테스트/CI 통과 후 PR을 머지하고 배포 화면을 확인한다.
6. 이후 `/api/portfolio/live`는 NHPLUG 실시간 데이터와 최신 연금계좌 수동 스냅샷을 함께 반환한다.

향후 NHPLUG 일반 잔고 API가 개인형IRP/DC 보유내역을 정상 반환하면 실시간 데이터를 우선하며 수동값으로 덮어쓰지 않는다.

## ChatGPT 최신 보유자산 판정 규칙

투자 판단/비중조절 전에 다음 순서로 확인한다.

1. GitHub `SimpleorNothing/ten-bagger`의 `portfolio-live` 브랜치에서 `portfolio-live.json`을 읽는다.
2. `source == "NHPLUG"`, `readOnly == true`, `fetchedAt`을 검증한다.
3. `fetchedAt`이 현재 시각 대비 10분 이내면 최신 계좌 스냅샷으로 우선 사용한다.
4. 응답의 `manualFallbacks`에 개인형IRP 또는 DC가 있으면 해당 계좌만 `asOf` 기준일의 수동 스냅샷임을 구분한다.
5. 수동 스냅샷의 현금이 확인되지 않은 경우 보유 ETF 평가금액 합계를 해당 계좌 전체자산으로 오인하지 않는다.
6. 10분 초과, 파일 부재, workflow 실패 시 최신 `holdings.json`/자산현황 Excel을 fallback으로 사용하고 지연 사실을 명시한다.
7. 스냅샷에는 실계좌 식별정보가 없으므로 계좌별 세부 구분이 필요한 경우 Alpha Map 인증 API에서 확인한다.

GitHub Actions 스케줄은 5분 간격이지만 GitHub 측 큐 지연이 발생할 수 있으므로 이를 초 단위 실시간으로 표현하지 않는다. Worker API 직접 조회는 요청 시점 잔고를 조회한다.

## 검증

로컬/CI:

```bash
node --check manual-portfolio.js
node --check nhplug-portfolio.js
node --check worker.js
node scripts/test-nhplug-portfolio.mjs
```

테스트에는 다음 회귀 검증을 포함한다.

- DC가 주식 잔고 비대상 유형으로 내려와도 `discovery`에서 사라지지 않는지
- 비대상 유형을 국내/해외 주식 잔고 API에 잘못 전달하지 않는지
- 개인형IRP가 계좌목록에는 있지만 일반 주식 잔고가 0일 때 수동 스냅샷으로 교체되는지
- 개인형IRP 4개 ETF 평가금액 합계가 4,811,610원과 일치하는지
- DC 9개 ETF 평가금액 합계가 431,206,120원과 일치하는지
- 두 연금계좌 모두 현금 미확인 상태가 명시되어 있는지
- access token 재사용이 유지되는지

실서비스 확인:

- 인증정보 미설정: `/api/portfolio/live` -> `503 NHPLUG_NOT_CONFIGURED`
- 설정 후 무인증 요청: `401 PORTFOLIO_UNAUTHORIZED`
- 로그인 또는 자동화 토큰 인증 후: `200`, `source=NHPLUG`, `readOnly=true`
- 수동 fallback 사용 시 `portfolioMode=NHPLUG+MANUAL`, `manualFallbacks`에 개인형IRP/DC 기준일 표시
- `NHPLUG portfolio snapshot` workflow 성공 후 `portfolio-live` 브랜치의 `portfolio-live.json` 갱신 확인
