# 02 기업분석 운영 규칙

기준일: 2026-08-17

이 문서는 Alpha Map `02 기업분석`의 운영 부록이다. 대용량 `OPS.md`를 반복 전체교체하지 않고 기업분석 전용 규칙을 독립 관리하며, 내용 충돌 시 `OPS.md`의 전역 데이터 무결성 원칙을 우선한다.

## 1. 단일 소스와 역할

- 기업별 정적·저빈도 사실: `marvell/data.json`, `lumentum/data.json`
- 가격·목표가·EPS 리비전·γ·stage: `gamma.json`만 단일 소스(SoT)
- 02 화면의 두 시계: `company-clock.js`가 `gamma.json`을 `cache:no-store`로 직접 읽는다. 두 시계 값을 기업별 data.json에 복사·고정하지 않는다.
- 공식 확정 일정: `calendar.json`
- 실적 이벤트 변동성 게이트: `earnings.json`
- 뉴스·내러티브 히스토리: `signal_log.json`. 이미 재무제표·8-K에 반영된 자본거래는 signal_log만으로 대체하지 않고 기업분석의 구조화 사실에도 반영한다.

## 2. 출처 우선순위

1. SEC/규제기관 제출자료: 10-K, 10-Q, 8-K, Proxy
2. 회사 공식 실적발표·Investor Relations 자료·컨퍼런스콜
3. 회사 공식 제품·M&A·투자 발표
4. 경쟁사 공식 발표(경쟁 시점·제품 비교에 한함)
5. Reuters 등 신뢰 가능한 원문 보도
6. 실적 콜 전사본은 회사 자료에서 구체 수치를 찾지 못한 경우 보조 근거로 사용하고 `경영진 전망`으로 명시

증권사 목표가 변경, 하루 주가 등락, 출처 불명 수치는 기업 전략·현황의 사실 데이터로 넣지 않는다.

## 3. 수치 규칙

- 실제 실적은 GAAP를 기본으로 하며 non-GAAP는 반드시 라벨을 붙인다.
- 계산값은 원자료와 산식을 재현 가능하게 남긴다. 예: FY28 매출 전망 $16.5B와 FY27 $11.5B의 산술 YoY는 `(16.5 / 11.5 - 1) = 43.5%`; 회사의 반올림 표현 `약 45%`는 note로 분리한다.
- 회사가 총 backlog를 공시하지 않으면 `미공시`로 유지한다. bookings, design win, purchase commitment를 총 backlog로 합산하지 않는다.
- 분기말 이후 발생사건은 실제 거래일을 회사가 공개하지 않으면 10-Q 제출일을 `공시일`로만 표시하고 거래일처럼 쓰지 않는다.
- 경쟁 제품은 `발표`, `샘플링`, `qualification`, `production shipment`, `revenue ramp`를 구분한다. 제품 공개만으로 매출 기여를 확정하지 않는다.

## 4. 업데이트 트리거

다음 사건 발생 시 해당 기업 `data.json`을 원문 재검증 후 갱신한다.

- 분기 실적, 연간 실적, 가이던스·장기전망 변경
- 주요 design win, 수주·구매 commitment, 장기 공급계약
- M&A, 전략적 지분투자, 전환증권·대규모 자본조달
- 생산능력·foundry/substrate commitment·CAPEX·대규모 예치금
- 신공정 node, 핵심 제품의 sampling/qualification/production 전환
- 매출 집중도가 큰 고객·배급사 구성 변화
- CFO/CEO 등 재무·실행체계에 직접 영향을 주는 경영진 변경
- 사업 매각·중단영업처럼 GAAP 마진·순이익 해석을 왜곡하는 일회성 사건

## 5. 실적·기업 이벤트 게이트

- 공식 IR에서 실적일이 확정되면 즉시 `calendar.json`과 `earnings.json`에 반영한다.
- 해외 일정은 `earnings.json.date`에는 기업 현지 발표일을, `calendar.json.d`에는 KST 실제 공개일을 사용하고 둘 다 시각을 메타에 적는다.
- D-7: IR 일정 재확인. 예상변동이 hist면 event-IV 갱신 준비.
- D-3: 프런트 옵션으로 expected move 재측정.
- D-1: 위클리 ATM 스트래들 등으로 expected move 최종 확인.
- D-Day: 방향 예측값으로 바꾸지 않는다. 이벤트 리스크는 중립 처리하고 실적 확인 대기.
- D+1: 실제 실적·가이던스를 기업분석에 반영하고 경과 이벤트를 `earnings.json`에서 제거하며 γ/stage/리비전 영향을 재평가한다.

Marvell의 현재 확정 이벤트:
- FY27 Q2 earnings call: 2026-08-27 13:45 PDT = 2026-08-28 05:45 KST
- Investor Day: 2026-10-06, New York City 오전(정확한 시작시각 미공개)

## 6. 두 시계 규칙

`company-clock.js`는 선택된 기업 티커를 `gamma.json`에 매핑해 다음을 표시한다.

- γ 상승여력, g 상태, stage, checkedAt
- 30일 주가 변화율 vs FY+1 EPS 30일 리비전 및 차이
- 90일 주가 변화율 vs FY+1 EPS 90일 리비전 및 차이

`주가 변화율 - EPS 리비전 > +1%p`면 `가격 추월`, `< -1%p`면 `EPS 개선 우위`, 그 사이는 `대체로 동행`으로 표시한다. 이 라벨은 관찰용이며 단독 매수·매도 신호가 아니다. 데이터가 없으면 직전값을 유지하지 않고 `자료에서 확인되지 않음`으로 표시한다.

## 7. 배포 전 검증

- 모든 수정 JSON parse 성공
- `company.js`, `company-clock.js`, `site-change-live.js` JavaScript syntax 통과
- `02 기업분석`은 iframe을 사용하지 않음
- 두 시계는 `gamma.json`을 no-store로 직접 읽고 정적 기업 JSON에 동적 값을 복제하지 않음
- Marvell/Lumentum 기업 전환 버튼 정상 유지
- 모바일에서 기업 본문 이중 스크롤 없음; 재무표만 필요 시 가로 스크롤 허용
- PR Gate 통과 후 병합, Cloudflare 배포 성공 및 custom domain이 merge SHA를 서비스하는지 확인

## 8. Marvell 다음 재검증 포인트

- 2026-08-27 FY27 Q2: $2.70B 매출 중간값, data center/interconnect 성장, non-GAAP GM, custom XPU·1.6T·51.2T ramp, bookings 지속성
- 2026-10-06 Investor Day: FY28~FY29 custom silicon·networking 장기 로드맵, 장기 margin/FCF/ROIC, NVIDIA·Celestial/XConn/Polariton 상용화 일정, 공급 capacity 회수기간
