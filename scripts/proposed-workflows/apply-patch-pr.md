# `apply-patch.yml` 룰셋 충돌 — 운영자 조치 체크리스트

`.github/workflows/` 는 GitHub App 권한 부재로 403 → **아래는 전부 운영자 수동 작업**이다.

## 증상

`patches/*.b64` 가 main 에 머지돼도 `index.html`·`signal_log.json` 본문이 반영되지 않는다.

## 원인 (2026-08-13 실측)

main 룰셋이 `Changes must be made through a pull request` 를 강제하면서, `apply-patch.yml` 의
`git push origin HEAD:main` 이 거부된다. 워크플로가 트리거되지 않은 것이 아니라 **트리거된 뒤 push 단계에서 죽는다.**

```
run 31704911169 (event=push, head=8a56bdb)
remote: error: GH013: Repository rule violations found for refs/heads/main.
        - Changes must be made through a pull request.
 ! [remote rejected] HEAD -> main (push declined due to repository rule violations)
##[error]push failed after 5 attempts
```

수동 `workflow_dispatch` 도 같은 지점에서 실패한다(런 31705794104 로 확인). **재실행은 해법이 아니다.**

동일 사유의 과거 실패: 런 31289908831(2026-08-09).

---

## 선택지 A — 룰셋 bypass 추가 (5분, 워크플로 무수정)

GitHub → **Settings → Rules → Rulesets** → main 을 타깃하는 룰셋 → **Bypass list** → **Add bypass**
→ Integrations 에서 **GitHub Actions** 를 추가.

- 장점: 워크플로 파일을 건드리지 않는다. main 직접 push 를 쓰는 **다른 워크플로도 한 번에 복구**된다.
- 단점: Actions 가 PR 없이 main 에 쓸 수 있게 되므로 룰셋의 보호 범위가 그만큼 줄어든다.
- 이 리포는 크론 워크플로가 많아(`update-prices`·`update-news` 등) A 가 운영 부담이 가장 적다.

## 선택지 B — PR 경로로 전환 (워크플로 교체)

같은 폴더의 **`apply-patch-pr.yml`** 을 `.github/workflows/apply-patch.yml` 로 덮어쓴다.

- main 에 직접 push 하지 않고 `claude/apply-patch-<run_id>` 브랜치 + PR 을 연다.
- `claude-pr-gate.yml` 이 base=main·head=`claude/*` PR 을 validate → **자동 squash 머지**하므로 무인 진행.
- 머지 push 가 `deploy.yml` 을 트리거하므로 **현행본의 `wrangler deploy` 스텝은 제거**했다(중복 배포 방지).
- 장점: 룰셋을 약화시키지 않는다. 모든 변경이 PR 기록으로 남는다.
- 단점: 이 워크플로 하나만 고쳐진다. main 직접 push 를 쓰는 나머지 워크플로는 그대로 막혀 있다.

---

## 적용 후 확인

1. `patches/` 에 테스트 패치를 하나 넣고 머지 → Actions 에서 `Apply index.html patch` 성공 확인
2. B 를 골랐다면 `claude/apply-patch-*` PR 이 자동 생성·자동 머지되는지 확인
3. 대상 파일 본문이 실제로 바뀌었는지, `patches/applied/` 로 이관됐는지 확인
4. `Deploy to Cloudflare Workers` 가 머지 커밋으로 1회만 돌았는지 확인

## 미해결로 남는 것

main 직접 push 에 의존하는 **다른 워크플로의 전수 조사**는 아직 하지 않았다. A 를 고르면 일괄 해소되고,
B 를 고르면 워크플로별로 같은 전환이 필요하다. 어느 워크플로가 실제로 막혀 있는지는 각 워크플로의
최근 실패 런에서 `GH013` 문자열로 확인할 수 있다.
