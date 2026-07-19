# 제안본 — 데일리 브리핑 팟캐스트 「MP3 슬랙 첨부」(A안) · 운영자 체크리스트

**현재 가동 중인 것(B안)은 링크형이다.** 슬랙 텍스트 브리핑 맨 아래 「🎧 오늘 브리핑 듣기」 링크 →
`/brief.html` 이 `/api/brief` 로 2인 대담 대본을 받아 브라우저 음성으로 읽는다. 키·스코프·워크플로 편집이 하나도 필요 없다.

A안은 그 대본을 **Gemini 멀티스피커 TTS(`gemini-3.1-flash-tts-preview` · AI Studio 「The Energetic Co-Host」 팟캐스트 톤)로 MP3 로 구워 슬랙 DM 에 파일로 올리는** 판이다.
모델·보이스·스타일은 `brief-tts.mjs` 상단 상수 또는 env(`GEMINI_TTS_MODEL`·`GEMINI_VOICE_HOST`·`GEMINI_VOICE_ANA`·`GEMINI_TTS_STYLE`)로 스튜디오에서 고른 값과 맞춘다.
잠금화면 재생·이어폰 이동 청취가 되는 대신 아래 3가지가 선행돼야 한다 — **전부 운영자 수동**(GitHub App 은 `.github/workflows/` 403).

## 선행 조건 3

| # | 무엇 | 어디서 | 비고 |
|---|---|---|---|
| 1 | 슬랙 봇에 **`files:write`** 스코프 추가 후 워크스페이스 **재설치** | api.slack.com → 앱 → OAuth & Permissions | 재설치하면 토큰이 바뀔 수 있다 → `SLACK_BOT_TOKEN` 시크릿도 갱신 |
| 2 | 리포 시크릿 **`SITE_PASSWORD`** 추가 | Settings → Secrets → Actions | 워커 비밀번호 게이트 통과용(러너가 `/api/brief` 를 읽어야 한다) |
| 3 | 리포 시크릿 **`GEMINI_API_KEY`** 확인/추가 | 동상 | 워커에는 이미 있으나 **Actions 시크릿과는 별개** |

`.github/workflows/daily-brief-podcast-audio.yml` 로 이 폴더의 yml 을 복사해 커밋하면 가동된다.
스크립트(`scripts/proposed-workflows/brief-tts.mjs`)는 그 자리에 둔 채 실행해도 되고, `scripts/` 로 옮겨도 된다(yml 의 경로만 맞추면 된다).

## 비용·용량 감각

- 대본 생성은 **B안과 공유**한다(`/api/brief` R2 날짜 캐시) → A안을 켜도 LLM 비용은 늘지 않는다.
- TTS 는 8분 기준 약 2,700자 × 2회분(청크 재시도 여유) ≈ 월 $1~2 추가.
- MP3 48kbps mono 8분 ≈ **2.8MB** — 슬랙 무료 첨부 한도에 여유.

## 실패 모드

| 증상 | 원인 | 조치 |
|---|---|---|
| `slack getUploadURL: missing_scope` | 1번 미완료 | `files:write` 추가 후 재설치 |
| `사이트 로그인 실패 (401)` | `SITE_PASSWORD` 불일치 | 워커 `SITE_PASSWORD` 와 동일 값인지 확인 |
| `gemini tts 429` | 레이트리밋 | 청크 크기(6발언)를 4로 낮추거나 재시도 |
| 음성이 한 명처럼 들림 | 멀티스피커 라벨 불일치 | `LABEL` 값과 프롬프트의 화자 표기가 같아야 한다 |

## 규율

이 파이프라인은 **읽기 전용**이다. 대본·오디오는 narrative 층이라 `gamma`·`judgment`·`holdings`·`earnings` 어느 것도 건드리지 않는다.
오디오가 실패해도 텍스트 브리핑(`daily-brief-slack.yml`)은 별도 워크플로라 영향받지 않는다.

## 갱신 이력

- 2026-07-19 최초 작성 — 링크형(B) 가동에 맞춰 오디오판(A) 제안본 배치.
- 2026-07-19 TTS 를 AI Studio 「The Energetic Co-Host」 팟캐스트판으로 맞춤 — 모델 `gemini-3.1-flash-tts-preview`·활기찬 공동 진행 톤·보이스 Puck/Kore(전부 env 오버라이드). SimpleorNothing 지시(스튜디오 스크린샷).
