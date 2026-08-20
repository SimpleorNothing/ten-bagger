# 02 기업분석 · 데일리 주요 뉴스 운영 규칙

기준일: 2026-08-20

## 목적

`02 기업분석`에 등록된 모든 기업을 매일 검색해 향후 실적과 기업가치에 영향을 줄 수 있는 주요 뉴스만 `company_news.json`에 반영한다. 이 자동화는 뉴스 레이어만 갱신하며, 기업별 핵심 전략·재무 수치·수주 사실이 들어 있는 `*/data.json`은 자동으로 수정하지 않는다.

## 대상 기업

대상 목록을 별도로 하드코딩하지 않는다. `company.js`의 `COMPANIES[].data` 경로를 읽어 각 `data.json`의 `company.name`과 `company.ticker`를 사용한다. 따라서 02 기업분석에 기업을 추가하면 다음 데일리 실행부터 자동으로 검색 대상에 포함된다.

## 검색·선별

- 매일 07:25 KST GitHub Actions 실행
- Google News RSS를 이용한 최근 2일 기본 검색 + 최근 7일 물질성 키워드 보강 검색
- 포함: 실적·가이던스, 수주·계약, 투자·CAPEX·생산능력, 제품·기술·출하·양산, 고객·공급망, M&A·자본, 규제·정책, CEO/CFO 등 핵심 경영진 변화
- 제외: 증권사 목표가·투자의견, 하루 주가 등락, 장전/시간외 등락, 단순 수급, 매수·매도 추천, 기술적 분석, 콘텐츠팜/주가홍보형 기사
- 자동 반영 허용 출처: 회사/SEC 원문 또는 Reuters·Business Wire 등 사전 정의한 신뢰 매체만 허용. 기타 출처는 자동 반영하지 않음
- 유료 LLM API는 사용하지 않는다.

## 데이터 분리

- `company_news.json`: 사이트 표시용 최근 30일 창, 기업당 최대 8건
- `archive/company_news_archive.json`: 확인된 뉴스 누적 보존
- `company-news.js`: 선택 기업 티커에 맞춰 뉴스 블록을 렌더링
- `scripts/fetch-company-news.mjs`: 검색·선별·병합
- `scripts/validate-company-news.mjs`: 스키마·중복·제외기사 회귀 검증

## 정확성 원칙

자동 수집 뉴스는 제목·출처·날짜·링크를 확인 가능한 형태로 표시한다. 기사 본문을 읽지 않고 수치나 투자 의미를 새로 만들어 넣지 않는다. 기존에 공식 공시로 검증된 `factualSummary`가 있으면 동일 기사 갱신 시 보존할 수 있다.

핵심 전략·실적·수주·CAPEX 수치 변경은 기존 `OPS_COMPANY_ANALYSIS.md` 규칙에 따라 SEC/회사 IR/공식 발표를 재검증한 뒤 `*/data.json`에 별도로 반영한다.

## 배포

데일리 작업은 `claude/automation-company-news-*` 브랜치와 PR을 생성한다. `Claude PR Gate` 통과 후 자동 병합되며, `company_news.json`이 사용자 표시 데이터이므로 main 병합 시 Cloudflare 배포가 실행된다.
