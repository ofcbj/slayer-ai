# GitHub Pages 배포 가이드

이 프로젝트는 GitHub Actions를 사용하여 자동으로 GitHub Pages에 배포됩니다.

## 초기 설정

### 1. GitHub Pages 활성화

1. GitHub 저장소 페이지로 이동
2. `Settings` > `Pages` 메뉴로 이동
3. **Source** 섹션에서 다음과 같이 설정:
   - Source: **GitHub Actions** 선택

### 2. 코드 푸시

설정이 완료되면, `master` 브랜치에 코드를 푸시할 때마다 자동으로 배포됩니다:

```bash
git add .
git commit -m "Your commit message"
git push origin master
```

### 3. 배포 확인

1. GitHub 저장소의 `Actions` 탭에서 배포 진행 상황 확인
2. 배포가 완료되면 다음 URL에서 게임에 접속 가능:
   - `https://ofcbj.github.io/slayer-ai/`

## 수동 배포

필요한 경우 수동으로 배포를 트리거할 수 있습니다:

1. GitHub 저장소의 `Actions` 탭으로 이동
2. 좌측 사이드바에서 `Deploy to GitHub Pages` 워크플로우 선택
3. `Run workflow` 버튼 클릭
4. `master` 브랜치 선택 후 `Run workflow` 실행

## 로컬 빌드 테스트

배포 전 로컬에서 프로덕션 빌드를 테스트할 수 있습니다:

```bash
# 프로덕션 빌드
NODE_ENV=production npm run build

# 빌드 결과 미리보기
npm run preview
```

## 배포 프로세스

1. **트리거**: `master` 브랜치에 푸시 또는 수동 실행
2. **빌드**:
   - Node.js 20 환경 설정
   - 의존성 설치 (`npm ci`)
   - TypeScript 컴파일 및 Vite 빌드
3. **배포**:
   - `dist/` 폴더를 GitHub Pages에 업로드
   - 자동으로 사이트 업데이트

## 트러블슈팅

### 404 에러가 발생하는 경우

1. GitHub Pages 설정이 올바른지 확인
2. `vite.config.js`의 `base` 경로가 저장소 이름과 일치하는지 확인
3. 배포 워크플로우가 성공적으로 완료되었는지 `Actions` 탭에서 확인

### 빌드 실패

1. `Actions` 탭에서 실패한 워크플로우의 로그 확인
2. 로컬에서 `npm run build` 실행하여 빌드 에러 확인
3. `package.json`의 의존성이 올바른지 확인

### 리소스 로딩 실패

1. `vite.config.js`의 `base` 설정 확인
2. 브라우저 개발자 도구의 콘솔에서 에러 메시지 확인
3. 경로가 `/slayer-ai/`로 시작하는지 확인

## 주요 파일

- `.github/workflows/deploy.yml`: GitHub Actions 워크플로우 설정
- `vite.config.js`: Vite 빌드 설정 (base path 포함)
- `package.json`: npm 스크립트 및 의존성

## 참고 사항

- 배포는 약 2-3분 정도 소요됩니다
- 첫 배포 후 사이트가 활성화되기까지 최대 10분 정도 걸릴 수 있습니다
- 캐시로 인해 변경사항이 즉시 반영되지 않을 수 있습니다 (강력 새로고침: Ctrl+Shift+R)
