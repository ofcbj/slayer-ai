# Sound Assets

이 폴더에는 게임 사운드 파일들이 위치합니다.

## 필요한 사운드 파일

다음 사운드 파일들을 이 폴더에 추가해주세요:

### 게임 시작
- `game-start.mp3` - 게임/전투 시작 시 재생

### 카드 관련
- `card-draw.mp3` - 카드를 드로우할 때
- `card-click.mp3` - 카드를 클릭할 때
- `card-play.mp3` - 카드를 사용할 때

### 공격
- `attack.mp3` - 일반 공격
- `attack-heavy.mp3` - 강한 공격

### 방어
- `defend.mp3` - 방어 카드 사용
- `block.mp3` - 공격 방어 성공

### 데미지
- `hit.mp3` - 타격 효과음
- `damage-player.mp3` - 플레이어가 피해를 입을 때
- `damage-enemy.mp3` - 적이 피해를 입을 때

### 결과
- `victory.mp3` - 전투 승리
- `defeat.mp3` - 전투 패배
- `enemy-death.mp3` - 적 사망

## 사운드 파일 형식

- 형식: MP3 또는 OGG
- 권장 길이: 0.5~2초 (효과음)
- 권장 볼륨: 정규화된 사운드

## 무료 사운드 리소스

다음 사이트에서 무료 사운드를 다운로드할 수 있습니다:
- https://freesound.org/
- https://mixkit.co/free-sound-effects/
- https://www.zapsplat.com/
- https://kenney.nl/assets (게임 에셋)

## 임시 파일 생성

현재는 실제 사운드 파일이 없어도 게임이 실행되도록 구현되어 있습니다.
사운드 파일이 없으면 콘솔에 경고만 출력되고 게임은 정상적으로 동작합니다.
