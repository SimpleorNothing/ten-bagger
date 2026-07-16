# 제안 워크플로 변경 — `update-prices.yml` (운영자 수동 · GitHub App 403)

결정보드 하루 2회 시가평가(`fetch-prices.mjs` `revalueHoldings`)가 리포·사이트에 반영되려면
시세 크론이 `holdings.json`을 커밋해야 한다. 아래 **한 줄**만 고치면 된다.

## 1) `.github/workflows/update-prices.yml` — 커밋 파일 목록에 holdings.json 추가

```diff
-          FILES="prices.json charts.json gamma.json cycle.json"
+          FILES="prices.json charts.json gamma.json cycle.json holdings.json"
```

- `fetch-prices.mjs`는 이미 `holdings.json`을 읽어 시가평가 후 다시 쓴다(비파괴 try/catch — 실패해도 시세는 정상 커밋).
- 이 줄이 없으면 `git add $FILES`가 holdings.json을 스테이징하지 않아 **평가가 리포에 안 올라간다**(침묵 스테일, OPS §1).

## 2) `.github/workflows/deploy.yml` — 불필요 배포 억제(선택, 권장)

```diff
     paths-ignore:
       - 'prices.json'
+      - 'holdings.json'   # 시세 크론의 시가평가 커밋은 배포 불필요(worker 런타임 서빙)
       - 'news.json'
       - 'signal_drafts.json'
```

- worker가 `holdings.json`을 런타임 서빙하면 배포 없이 갱신되므로, 하루 2회 배포를 아낀다.
- 만약 정적 번들로 서빙 중이면 이 줄은 **넣지 말 것**(그 경우 배포가 있어야 갱신됨).

반영 후 `Update stock prices` 수동 dispatch 1회로 즉시 확인(다음 크론 06:37·18:37 KST부터 자동).
