/**
 * 공통 타입 정의
 * 프로젝트 전체에서 사용되는 타입들을 중앙에서 관리합니다.
 */

/**
 * 플레이어 상태
 */
export interface PlayerState {
  maxHealth : number;
  health    : number;
  energy    : number;
  maxEnergy : number;
  defense   : number;
}

/**
 * 카드 데이터
 */
export interface CardData {
  name        : string;
  type?       : string;
  cost        : number;
  damage?     : number;
  block?      : number;
  heal?       : number;
  energy?     : number;
  allEnemies? : boolean;
  hits?       : number;
  selfDamage? : number;
  description?: string;
  image?      : string;
  [key: string]: unknown;
}

/**
 * 적 데이터
 */
export interface EnemyData {
  name      : string;
  health?   : number;
  hp?       : number;
  attack?   : number;
  defense?  : number;
  image?    : string;
}

/**
 * 스테이지 데이터
 */
export interface StageData {
  id            : string;
  data: {
    enemies     : string[];
    type        : string;
    nextStages? : string[];
  };
}

/**
 * 게임 상태
 */
export interface GameState {
  player        : PlayerState;
  deck          : CardData[];
  stagesCleared : string[];
  currentStage  : string;
}
