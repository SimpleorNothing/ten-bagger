import fs from 'node:fs';

const path = 'OPS.md';
let s = fs.readFileSync(path, 'utf8');
const before = s;

function replaceOnce(re, replacement, label) {
  const matches = [...s.matchAll(new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g'))];
  if (matches.length !== 1) throw new Error(`${label}: expected 1 match, got ${matches.length}`);
  s = s.replace(re, replacement);
}
function insertAfterOnce(anchor, text, label) {
  const first = s.indexOf(anchor);
  const last = s.lastIndexOf(anchor);
  if (first < 0 || first !== last) throw new Error(`${label}: anchor count must be 1`);
  s = s.slice(0, first + anchor.length) + text + s.slice(first + anchor.length);
}

replaceOnce(/\*\*최종 갱신: 2026-08-16 09:31 \(KST\)\*\*/, '**최종 갱신: 2026-08-16 13:01 (KST)**', 'top timestamp');

insertAfterOnce('# OPS — 알파맵 운영 가이드\n', `\n> 2026-08-16 13:01 · **05 실제 비중조절 우선순위 갱신 주기 명문화·OPS 감시 강화.** 실제 비중조절 순위는 독립 크론 값이 아니라 페이지 로드 시 \`gamma.json\`+\`holdings.json\`을 \`no-store\`로 읽어 제로베이스 점수에서 레이어 집중도·동일 레이어 중복노출 감점을 적용해 즉시 재계산한다. 원천 데이터의 라이브 예약은 \`update-prices.yml\` 기준 06:05·06:35·16:52 KST 3회이며, 실행→출처 검증→보호 main 자동 PR→병합 후 다음 페이지 로드부터 새 순위가 반영된다. GitHub Actions 큐 지연은 가능하므로 예약시각=반영시각으로 보지 않는다. \`scripts/audit-ops.mjs\`가 3개 cron·gamma 갱신/출처 검증 배선·dual-rank no-store·gamma 신선도를 매일 검사하도록 강화했다.\n`, 'top history');

replaceOnce(/\| 코스피·S&P·나스닥 지수 \| 자동 \| 06:05·15:40 KST 예약 \(1일 2회 · 실측지연 ~1~1\.5h §8 — 저녁분 15:40 예약은 운영자 yml 적용 대기\) \|/, '| 코스피·S&P·나스닥 지수 | 자동 | **06:05·06:35·16:52 KST 예약** (1일 3회 · Actions 큐 지연 가능) |', 'index cadence');
replaceOnce(/\| 미 10년물 금리 \| 자동 \| 06:05·15:40 KST 예약\(시세 크론 편승 §6-1\) \+ 폴백 런타임 \|/, '| 미 10년물 금리 | 자동 | **06:05·06:35·16:52 KST 예약**(시세 크론 편승 §6-1 · Actions 큐 지연 가능) + 폴백 런타임 |', 'us10y cadence');

const trackerRowNeedle = '| 시장 모멘텀 전망 + 추정 리비전 트래커 (`#momOutlook`·`#probEst`) | 자동(런타임) | gamma·signals·charts 일별 | index.html 인라인 IIFE. `renderMom`=signals+삼성 프록시 레짐 · `renderRev`=`gamma.json` `rev`(TP·EPS·주가 리비전·애널·강등 게이트 d30). **강등 게이트 = 30d 주가 − 30d EPS(FY+1) 리비전율**(양수=가격 추월·성숙 강등 후보 / 음수=추정 앞섬·γ open). 관측치·예측 아님 |\n';
insertAfterOnce(trackerRowNeedle, '| ↳ **제로베이스 투자매력도·실제 비중조절 우선순위** (`DUAL_RANK_UI_V2`) | 자동(런타임 파생) | **페이지 로드 시 최신 `gamma.json`+`holdings.json`으로 재계산** | 두 파일을 `cache:no-store`로 읽고 제로베이스 점수에서 레이어 집중도·동일 레이어 중복노출 감점을 적용해 실제 점수와 순위를 다시 계산한다. **자체 크론 없음.** 원천 데이터는 `update-prices.yml` 06:05·06:35·16:52 KST 예약 실행 → gamma/리비전 출처 검증 → 보호 main 자동 PR → 병합 순서로 갱신되며, 병합 후 다음 페이지 로드부터 새 순위가 반영된다. 예약시각과 실제 반영시각은 Actions 큐·검증·PR 병합 시간만큼 차이날 수 있다. |\n', 'dual rank inventory row');

replaceOnce(/\| 일별 \(06:05·15:40 예약\) \| 시세·차트·γ·E군집 업데이트 \(`update-prices\.yml`\) \| — \|/, '| 일별 (**06:05·06:35·16:52 KST 예약**) | 시세·차트·γ·E군집 업데이트 (`update-prices.yml`) → 검증·자동 PR·main 병합 후 라이브 | — |', 'cadence table');
replaceOnce(/\| `update-prices\.yml` \| cron 06:05·15:40 KST 예약 \(저녁분 15:40은 운영자 적용 대기 §8 · 실측지연 ~1~1\.5h\) \| `prices\.json` · `charts\.json` · `gamma\.json` · `cycle\.json`\(E군집\) · `holdings\.json` \|/, '| `update-prices.yml` | cron **06:05·06:35·16:52 KST 예약**(UTC `5 21`·`35 21`·`52 7`; Actions 큐 지연 가능) → 데이터/리비전 출처 검증 → 변경 시 `claude/automation-update-prices-*` PR → PR Gate 병합 | `prices.json` · `charts.json` · `gamma.json` · `cycle.json`(E군집) · `holdings.json` · `raw/revisions` |', 'workflow table');

replaceOnce(/- \*\*⏳ 저녁 시세 크론 예약 15:40 변경 — 운영자 yml 적용 대기\*\*: Actions 큐 실측지연\(~1~1\.5h\) 보정을 위해 예약을 당기는 방식으로 운영 중\(현행 라이브 `52 7`=16:52 KST 예약→~18:30 완료\)\./, '- **저녁 시세 크론 15:40 변경안은 미적용 상태.** 현행 라이브 예약은 `5 21`·`35 21`·`52 7` = **06:05·06:35·16:52 KST 3회**다. Actions 큐 지연 때문에 예약시각=실제 시작/반영시각은 아니며, 15:40 조기 예약안은 별도 운영 변경 후보로만 유지한다.', 'known issue cadence');

insertAfterOnce('## 9. 갱신 이력\n', '\n- 2026-08-16 13:01 · **05 실제 비중조절 우선순위 갱신 주기 명문화·OPS 자동감사 강화.** `scripts/apply_dual_rank_ui.py` 실사 결과 실제 비중조절은 별도 배치값이 아니라 페이지 로드 때 `gamma.json`·`holdings.json`을 `no-store`로 읽어 재계산한다. `update-prices.yml` 라이브 cron은 06:05·06:35·16:52 KST 3회이며, 데이터 생성·리비전 원출처 검증 후 변경분을 보호 main PR로 올려 병합된 뒤 다음 로드부터 순위에 반영된다. 기존 OPS의 06:05·15:40 표기는 라이브 yml과 불일치해 정정했고, 15:40은 미적용 운영 후보로 분리했다. `audit-ops.mjs`에 gamma 신선도·3개 cron·`fetch-gamma`/provenance 검증·dual-rank `no-store`/점수 파생 배선 검사를 추가해 향후 문서/코드 드리프트를 실패로 노출한다.\n', 'history entry');

if (s === before) throw new Error('OPS patch made no change');
fs.writeFileSync(path, s);
console.log(`OPS cadence patch applied: ${Buffer.byteLength(before)} -> ${Buffer.byteLength(s)} bytes`);
