import { CardData } from '../../../types';
import LanguageManager from '../../../i18n/LanguageManager';

interface GameData {
  cards_attack: {
    [key: string]: any;
  };
  cards_skill: {
    [key: string]: any;
  };
  cards_cat: {
    rewards: string[];
    start_deck: {
      [cardId: string]: number;
    };
  };
  enemies: {
    [key: string]: any;
  };
  stages: {
    [key: string]: any;
  };
  buffs: {
    [key: string]: {
      type          : string;
      duration      : number;
      image         : string;
      name_ko       : string;
      name_ja       : string;
      description_kr: string;
      description_ja: string;
    };
  };
}

/**
 * 게임 데이터 관리 클래스
 * JSON 파일 로드 및 데이터 제공을 담당
 */
class GameDataManager {
  private static instance: GameDataManager;
  private gameData: GameData | null = null;

  private constructor() {}

  public static getInstance(): GameDataManager {
    if (!GameDataManager.instance) {
      GameDataManager.instance = new GameDataManager();
    }
    return GameDataManager.instance;
  }

  public async loadGameData(): Promise<void> {
    if (this.gameData) return; // 이미 로드됨

    try {
      const basePath = import.meta.env.BASE_URL || '/';
      const [cardsAttackRes, cardsSkillRes, cardsCatRes, enemiesRes, stagesRes, buffsRes] = await Promise.all([
        fetch(`${basePath}data/cards-attack.json`),
        fetch(`${basePath}data/cards-skill.json`),
        fetch(`${basePath}data/cards-category.json`),
        fetch(`${basePath}data/enemies.json`),
        fetch(`${basePath}data/stages.json`),
        fetch(`${basePath}data/buff.json`)
      ]);

      this.gameData = {
        cards_attack : await cardsAttackRes.json(),
        cards_skill  : await cardsSkillRes.json(),
        cards_cat    : await cardsCatRes.json(),
        enemies      : await enemiesRes.json(),
        stages       : await stagesRes.json(),
        buffs        : await buffsRes.json()
      };
    } catch (error) {
      console.error('Failed to load game data:', error);
      throw error;
    }
  }

  public getCardData(): Record<string, CardData> {
    if (!this.gameData) {
      console.error('Game data not loaded');
      return {};
    }

    const langManager = LanguageManager.getInstance();
    const lang = langManager.getLanguage();
    const suffix = lang === 'ko' ? '_ko' : '_ja';

    // 모든 카드를 하나의 맵으로 병합 (attack + skill)
    const allCards = {
      ...this.gameData.cards_attack,
      ...this.gameData.cards_skill
    };

    const result: Record<string, CardData> = {};

    Object.keys(allCards).forEach((cardId) => {
      const card = allCards[cardId];
      result[cardId] = {
        id          : cardId,
        name        : card[`name${suffix}`],
        description : card[`description${suffix}`],
        type        : card.type,
        cost        : card.cost ?? 0, // cost가 없을 때 기본값 0 사용
        damage      : card.damage,
        defense     : card.defense,
        block       : card.block,
        heal        : card.heal,
        energy      : card.energy,
        selfDamage  : card.selfDamage,
        draw        : card.draw,
        effect      : card.effect,
        effects     : card.effects,
        image       : card.image,
        sound       : card.sound,
        rarity      : card.rarity,
        allEnemies  : card.allEnemies,
        hits        : card.hits,
        buff        : card.buff,
        price       : card.price
      };
    });

    return result;
  }

  public getEnemyData() {
    if (!this.gameData) {
      console.error('Game data not loaded');
      return {};
    }

    const langManager = LanguageManager.getInstance();
    const lang        = langManager.getLanguage();
    const suffix      = lang === 'ko' ? '_ko' : '_ja';
    const result: any = {};

    Object.keys(this.gameData.enemies).forEach((enemyId) => {
      const enemy = this.gameData!.enemies[enemyId];
      result[enemyId] = {
        ...enemy,
        name: enemy[`name${suffix}`]
      };
    });

    return result;
  }

  public getStageData() {
    if (!this.gameData) {
      console.error('Game data not loaded');
      return {};
    }

    const langManager = LanguageManager.getInstance();
    const lang        = langManager.getLanguage();
    const suffix      = lang === 'ko' ? '_ko' : '_ja';
    const result: any = {};

    Object.keys(this.gameData.stages).forEach((stageId) => {
      const stage = this.gameData!.stages[stageId];
      result[stageId] = {
        ...stage,
        name        : stage[`name${suffix}`],
        description : stage[`description${suffix}`],
        type        : this.translateStageType(stage.type, lang),
      };
    });

    return result;
  }

  public getStartDeck(): string[] {
    if (!this.gameData) {
      console.error('Game data not loaded');
      return [];
    }
    const startDeckObj = this.gameData.cards_cat.start_deck;
    // { cardId: count } 형식을 배열로 변환
    const deck: string[] = [];
    Object.keys(startDeckObj).forEach((cardId) => {
      const count = startDeckObj[cardId];
      for (let i = 0; i < count; i++) {
        deck.push(cardId);
      }
    });
    return deck;
  }

  public convertCardIdsToCardData(cardIds: string[]): CardData[] {
    const allCards = this.getCardData();
    return cardIds
      .map(cardId => allCards[cardId])
      .filter((card): card is CardData => card !== undefined);
  }

  public getRewardCards(): any[] {
    if (!this.gameData) {
      console.error('Game data not loaded');
      return [];
    }
    const rewardCardIds = this.gameData.cards_cat.rewards;
    const allCards = this.getCardData();
    
    // reward ID들에 해당하는 CardData 배열 반환
    return rewardCardIds.map(id => allCards[id]).filter(Boolean);
  }

  public getBuffDuration(buffId: string): number {
    if (!this.gameData || !this.gameData.buffs || !this.gameData.buffs[buffId]) {
      console.warn(`Buff data not found for: ${buffId}, using default duration 2`);
      return 2;
    }
    return this.gameData.buffs[buffId].duration;
  }

  private translateStageType(stageType: string, lang: 'ko' | 'ja'): string {
    const typeMap: Record<string, Record<'ko' | 'ja', string>> = {
      'normal'  : { ko: '일반',   ja: 'ノーマル' },
      'elite'   : { ko: '중보스', ja: 'エリート' },
      'mid_boss': { ko: '중보스', ja: '中ボス' },
      'boss'    : { ko: '보스',   ja: 'ボス' }
    };

    return typeMap[stageType]?.[lang] || stageType;
  }
}

export default GameDataManager;
