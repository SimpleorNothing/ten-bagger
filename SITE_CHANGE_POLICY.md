# 사이트 변경 이력 기준

사이트 변경 이력은 GitHub 커밋 또는 PR 생성 자체가 아니라, `simpleornothing.com`에서 사용자가 실제로 체감할 수 있는 화면·기능·표시 콘텐츠가 변경되고 해당 GitHub SHA가 custom domain에서 실제 서비스되는 것이 검증된 경우만 기록한다.

기록 대상은 배포되는 HTML/JS/CSS 및 사용자 화면에 직접 반영되는 콘텐츠 파일의 변경이다. 단순 크론 데이터 수집, 빌드·CI, 문서, 테스트, 리팩터링, 원천 보관(`raw/`), 운영 스크립트·워크플로 변경만 있는 경우는 기록하지 않는다.

배포 workflow는 직전 custom domain 배포 SHA와 새 SHA의 사용자 향 파일 차이를 비교해 후보 이력을 생성하고, 배포 후 `simpleornothing.com/__version`이 새 SHA를 반환하는지 검증한다. 실제 사이트 SHA 검증을 통과해야 배포 완료로 본다.
