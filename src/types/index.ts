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
  id          : string;
  name        : string;
  cost        : number;
  type        : 'attack' | 'skill' | 'power';
  damage      : number;
  defense     : number;
  block       : number;  // 방어력 (defense와 동일)
  heal        : number;
  energy      : number;
  selfDamage  : number;
  draw        : number;  // 카드 사용 시 드로우할 카드 수
  effect      : string;
  effects     : any[];  // 카드 효과 배열
  description : string;
  image       : string;
  sound       : string;  // 카드 사용 시 재생할 사운드
  rarity      : 'common' | 'uncommon' | 'rare' | 'epic';
  allEnemies  : boolean;
  hits        : number;
  buff        : string;  // 적용할 디버프 ID (vulnerable, weak 등)
  price       : number;  // 상점에서 판매 가격
}

/**
 * Buff/Debuff 인터페이스
 */
export interface Buff {
  id          : string;
  type        : 'buff' | 'debuff';
  duration    : number;  // 남은 턴 수
}

export type BuffType = 'vulnerable' | 'weak';

/**
 * Card 컨테이너의 확장 프로퍼티
 */
export interface CardExtended {
  cardData    : CardData;
  originalY   : number;
  bg          : Phaser.GameObjects.Rectangle;
  playParticleEffect: (targetX: number, targetY: number) => void;
}

export interface EnemyData {
  id        : string;
  name      : string;
  health    : number;
  hp        : number;
  attack    : number;
  defense   : number;
  attackPattern?: Array<{ type: string; damage?: number; defense?: number }>;
  image?    : string;
}

/**
 * Enemy 객체의 확장 프로퍼티
 */
export interface EnemyExtended {
  enemyData   : EnemyData;
  intent      : { type: 'attack' | 'defend' | 'special' | string; value?: number } | null;
}

/**
 * 스테이지 데이터
 */
export interface StageData {
  id            : string;
  data          : {
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