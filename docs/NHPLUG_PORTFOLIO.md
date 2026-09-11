# NHPLUG 실시간 보유자산 연동

## 목적

나무증권(Namuh)의 공식 NHPLUG Open API를 사용해 Alpha Map과 ChatGPT가 같은 최신 계좌 데이터를 참조한다.

- 운영 계좌 조회만 사용한다.
- 주문/매수/매도 API는 구현하지 않는다.
- 계좌번호·고객식별자·App Key/Secret·access token은 외부 응답/스냅샷에서 제거 또는 마스킹한다.
- 기존 `holdings.json`/자산현황 Excel은 장애 시 fallback 및 장기 기준자료로 유지한다.

## 데이터 흐름

```text
Namuh 계좌
  -> NHPLUG REST
  -> Cloudflare Worker /api/portfolio/live
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

## ChatGPT 최신 보유자산 판정 규칙

투자 판단/비중조절 전에 다음 순서로 확인한다.

1. GitHub `SimpleorNothing/ten-bagger`의 `portfolio-live` 브랜치에서 `portfolio-live.json`을 읽는다.
2. `source == "NHPLUG"`, `readOnly == true`, `fetchedAt`을 검증한다.
3. `fetchedAt`이 현재 시각 대비 10분 이내면 최신 계좌 스냅샷으로 우선 사용한다.
4. 10분 초과, 파일 부재, workflow 실패 시 최신 `holdings.json`/자산현황 Excel을 fallback으로 사용하고 지연 사실을 명시한다.
5. 스냅샷에는 실계좌 식별정보가 없으므로 계좌별 세부 구분이 필요한 경우 Alpha Map 인증 API에서 확인한다.

GitHub Actions 스케줄은 5분 간격이지만 GitHub 측 큐 지연이 발생할 수 있으므로 이를 초 단위 실시간으로 표현하지 않는다. Worker API 직접 조회는 요청 시점 잔고를 조회한다.

## 검증

로컬/CI:

```bash
node --check nhplug-portfolio.js
node --check worker.js
node scripts/test-nhplug-portfolio.mjs
```

실서비스 확인:

- 인증정보 미설정: `/api/portfolio/live` -> `503 NHPLUG_NOT_CONFIGURED`
- 설정 후 무인증 요청: `401 PORTFOLIO_UNAUTHORIZED`
- 로그인 또는 자동화 토큰 인증 후: `200`, `source=NHPLUG`, `readOnly=true`
- `NHPLUG portfolio snapshot` workflow 성공 후 `portfolio-live` 브랜치의 `portfolio-live.json` 갱신 확인
