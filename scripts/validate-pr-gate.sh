#!/usr/bin/env bash
set -euo pipefail

BASE_REF="${1:-origin/main}"

SIZE=$(stat -c%s index.html)
echo "index.html size: $SIZE"
[ "$SIZE" -gt 150000 ] || { echo "::error::index.html 비정상 축소($SIZE) - 잘림 의심"; exit 1; }
grep -q "const D=" index.html || { echo "::error::const D= 앵커 소실"; exit 1; }
grep -q "HOLDINGS" index.html || { echo "::error::HOLDINGS 앵커 소실"; exit 1; }

for f in alpha.json earnings.json judgment.json news.json prices.json calendar.json company_news.json marvell/data.json lumentum/data.json micron/data.json vertiv/data.json nvidia/data.json; do
  if [ -f "$f" ]; then
    python3 -c "import json;json.load(open('$f'))" || { echo "::error::$f JSON 깨짐"; exit 1; }
  fi
done

CHANGED=$(git diff --name-only "$BASE_REF...HEAD" -- 'patches/*.b64' ':(exclude)patches/applied/*' || true)
if [ -z "$CHANGED" ]; then
  echo "변경된 활성 patch 없음"
else
  for B in $CHANGED; do
    [ -f "$B" ] || continue
    echo "validating $B"
    if ! base64 -d "$B" > /tmp/pr-gate.patch; then
      echo "::error::$B base64 깨짐"
      exit 1
    fi
    if git apply --check /tmp/pr-gate.patch 2>/dev/null; then
      echo "$B 적용 가능"
      continue
    fi
    if git apply --reverse --check /tmp/pr-gate.patch 2>/dev/null; then
      echo "$B 이미 적용된 payload"
      continue
    fi
    echo "::error::$B patch가 현재 base에 적용되지 않고 이미 적용된 상태도 아님"
    exit 1
  done
fi

node --check company.js
node --check company-clock.js
node --check company-news.js
node --check brief.js
node scripts/test-brief-static-nav.mjs
node --check site-change-live.js
node --check allocation-dynamic.js
node --check scripts/build-investment-scores.mjs
node scripts/build-investment-scores.mjs
node - <<'NODE'
const fs = require('fs');
const s = JSON.parse(fs.readFileSync('scores.json','utf8'));
if (s.schema !== 'investment-scores-v4') throw new Error('investment score schema mismatch');
if (s.modelVersion !== '4.2.0') throw new Error('investment score modelVersion mismatch');
for (const [ticker,row] of Object.entries(s.rows || {})) {
  const v = row && row.v4;
  if (!v) continue;
  const bonus = Number(v.opportunityAdjustment || 0);
  if (!(bonus >= 0 && bonus <= 10)) throw new Error(ticker + ': dislocation bonus out of range');
  const fd = v.inputs && v.inputs.fundamentalDislocation;
  if (bonus > 0 && !fd?.qualified) throw new Error(ticker + ': bonus without qualification');
  if (fd?.qualified) {
    if (!(fd.shock7dWorst1d <= -8)) throw new Error(ticker + ': qualified without sharp drop');
    if (!(fd.residualFromPreShock <= -5)) throw new Error(ticker + ': qualified after recovery');
    if (!(v.inputs.fy1c30 >= 0)) throw new Error(ticker + ': qualified despite FY+1 estimate deterioration');
  }

  const ac = v.inputs && v.inputs.analystCoverage;
  if (ac?.lowCoverage) {
    if (!(ac.analystCount >= 1 && ac.analystCount <= 4)) throw new Error(ticker + ': invalid low analyst count');
    if (!(ac.confidence >= 0.55 && ac.confidence < 1)) throw new Error(ticker + ': invalid low-coverage confidence');
    const expectedGrowth = ac.rawGrowthScore == null ? null : 50 + (ac.rawGrowthScore - 50) * ac.confidence;
    const expectedValuation = ac.rawValuationScore == null ? null : 50 + (ac.rawValuationScore - 50) * ac.confidence;
    if (expectedGrowth != null && Math.abs(v.dimensions.growth - expectedGrowth) > 1e-9) throw new Error(ticker + ': growth coverage shrinkage mismatch');
    if (expectedValuation != null && Math.abs(v.dimensions.valuation - expectedValuation) > 1e-9) throw new Error(ticker + ': valuation coverage shrinkage mismatch');
  }
}
const techwing = s.rows?.['089030']?.v4;
if (techwing?.inputs?.analystCoverage?.analystCount === 1) {
  if (!(techwing.dimensions.growth < techwing.inputs.analystCoverage.rawGrowthScore)) throw new Error('089030: growth score not discounted');
  if (!(techwing.dimensions.valuation < techwing.inputs.analystCoverage.rawValuationScore)) throw new Error('089030: valuation score not discounted');
  console.log(`089030 low-coverage adjusted score=${techwing.score}, growth=${techwing.dimensions.growth.toFixed(1)}, valuation=${techwing.dimensions.valuation.toFixed(1)}`);
}
console.log('V4.2 growth-dislocation + analyst-coverage invariants passed');
NODE
git checkout -- scores.json
if [ -f scripts/validate-company-analysis.mjs ]; then
  node scripts/validate-company-analysis.mjs
fi
if [ -f scripts/validate-company-news.mjs ]; then
  node scripts/validate-company-news.mjs
fi

grep -Fq "if(n.innerHTML!==html)n.innerHTML=html" site-change-live.js || { echo "::error::업데이트 이력 배지 idempotent guard 소실"; exit 1; }
grep -Fq "badgePatchQueued" site-change-live.js || { echo "::error::업데이트 이력 mutation coalescing 소실"; exit 1; }
if grep -Fq "new MutationObserver" allocation-dynamic.js; then
  echo "::error::06 비중조절 자체 DOM MutationObserver 재유입"
  exit 1
fi
grep -Fq "setInterval(function(){if(!document.getElementById('dynamicAllocHurdle')" allocation-dynamic.js || { echo "::error::06 비중조절 저빈도 복구 경로 소실"; exit 1; }

node --check worker.js
grep -Fq 'const SITE_APPLY_FILES = new Set(["gates.json", "risk.json", "signal_log.json", "calendar.json"]);' worker.js || { echo "::error::사이트 반영 대상 SoT 소실"; exit 1; }
grep -Fq 'if (file === "signal_log.json")' worker.js || { echo "::error::signal_log 반영 경로 소실"; exit 1; }
grep -Fq 'if (file === "calendar.json")' worker.js || { echo "::error::calendar 반영 경로 소실"; exit 1; }
grep -Fq 'function normalizeInsightFiscalJSON' worker.js || { echo "::error::인사이트 FY/FQ 정규화 소실"; exit 1; }
grep -Fq 'disableThinking: true' worker.js || { echo "::error::Claude JSON 재시도 경로 소실"; exit 1; }
grep -Fq 'function mergeGaugeUpdates' worker.js || { echo "::error::게이지 부분 병합 보호 경로 소실"; exit 1; }
grep -Fq 'gauge_updates' worker.js || { echo "::error::게이지 부분 갱신 프롬프트 소실"; exit 1; }
if grep -Fq 'gauge shape mismatch' worker.js; then
  echo "::error::구형 전체 배열 일치 검증 재유입"
  exit 1
fi
if grep -Fq 'claude response not json' worker.js; then
  echo "::error::구형 단발 JSON 파싱 경로 재유입"
  exit 1
fi

echo "PR gate validation passed"
