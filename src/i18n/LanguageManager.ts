import commonKo from '../locales/ko/common.json';
import commonJa from '../locales/ja/common.json';
import { CardData } from '../types';

export type Language = 'ko' | 'ja';

interface CommonTranslations {
  [key: string]: any;
}

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
}

class LanguageManager {
  private static instance: LanguageManager;
  private currentLanguage: Language = 'ko';
  private commonTranslations: Record<Language, CommonTranslations> = {
    ko: commonKo,
    ja: commonJa,
  };
  private gameData: GameData | null = null;

  private constructor() {
    const savedLanguage = localStorage.getItem('language') as Language;
    if (savedLanguage && (savedLanguage === 'ko' || savedLanguage === 'ja')) {
      this.currentLanguage = savedLanguage;
    }
  }

  public static getInstance(): LanguageManager {
    if (!LanguageManager.instance) {
      LanguageManager.instance = new LanguageManager();
    }
    return LanguageManager.instance;
  }

  public setLanguage(language: Language): void {
    this.currentLanguage = language;
    localStorage.setItem('language', language);
  }

  public getLanguage(): Language {
    return this.currentLanguage;
  }

  // UI 텍스트 번역 (common에서)
  public t(path: string, variables?: Record<string, any>): string {
    const keys = path.split('.');
    let value: any = this.commonTranslations[this.currentLanguage];

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        console.warn(`Translation key not found: ${path}`);
        return path;
      }
    }

    if (typeof value !== 'string') {
      console.warn(`Translation value is not a string: ${path}`);
      return path;
    }

    if (variables) {
      return this.interpolate(value, variables);
    }

    return value;
  }

  private interpolate(str: string, variables: Record<string, any>): string {
    return str.replace(/\{(\w+)\}/g, (match, key) => {
      return variables[key] !== undefined ? String(variables[key]) : match;
    });
  }

  // 게임 데이터 로드 (async)
  public async loadGameData(): Promise<void> {
    if (this.gameData) return; // 이미 로드됨

    try {
      const basePath = import.meta.env.BASE_URL || '/';
      const [cardsAttackRes, cardsSkillRes, cardsCatRes, enemiesRes, stagesRes] = await Promise.all([
        fetch(`${basePath}data/cards_attack.json`),
        fetch(`${basePath}data/cards_skill.json`),
        fetch(`${basePath}data/cards_cat.json`),
        fetch(`${basePath}data/enemies.json`),
        fetch(`${basePath}data/stages.json`)
      ]);

      this.gameData = {
        cards_attack: await cardsAttackRes.json(),
        cards_skill: await cardsSkillRes.json(),
        cards_cat: await cardsCatRes.json(),
        enemies: await enemiesRes.json(),
        stages: await stagesRes.json()
      };
    } catch (error) {
      console.error('Failed to load game data:', error);
      throw error;
    }
  }

  // 카드 데이터 가져오기 (언어별로 변환)
  public getCardData() {
    if (!this.gameData) {
      console.error('Game data not loaded');
      return { rewards: [] };
    }

    const lang = this.currentLanguage;
    const suffix = lang === 'ko' ? '_ko' : '_ja';

    // 모든 카드를 하나의 맵으로 병합 (attack + skill)
    const allCards = {
      ...this.gameData.cards_attack,
      ...this.gameData.cards_skill
    };

    const translateCard = (cardId: string) => {
      const card = allCards[cardId];
      if (!card) {
        console.warn(`Card not found: ${cardId}`);
        return null;
      }
      return {
        id: cardId,
        ...card,
        name: card[`name${suffix}`],
        description: card[`description${suffix}`],
      };
    };

    // rewards 카드 ID 배열을 가져와서 변환
    const rewardCards = this.gameData.cards_cat.rewards
      .map(translateCard)
      .filter(card => card !== null);

    return {
      rewards: rewardCards,
    };
  }

  // 시작 덱 가져오기
  public getStartDeck(): CardData[] {
    if (!this.gameData) {
      console.error('Game data not loaded');
      return [];
    }

    const lang = this.currentLanguage;
    const suffix = lang === 'ko' ? '_ko' : '_ja';

    // 모든 카드를 하나의 맵으로 병합
    const allCards = {
      ...this.gameData.cards_attack,
      ...this.gameData.cards_skill
    };

    const startDeck: CardData[] = [];
    const startDeckConfig = this.gameData.cards_cat.start_deck;

    // start_deck 설정에 따라 카드 생성
    Object.entries(startDeckConfig).forEach(([cardId, count]) => {
      const card = allCards[cardId];
      if (!card) {
        console.warn(`Start deck card not found: ${cardId}`);
        return;
      }

      // 카드를 count만큼 복사하여 추가
      for (let i = 0; i < count; i++) {
        startDeck.push({
          id: cardId,
          ...card,
          name: card[`name${suffix}`],
          description: card[`description${suffix}`],
        });
      }
    });

    return startDeck;
  }


  // 적 데이터 가져오기
  public getEnemyData(enemyKey: string) {
    if (!this.gameData) {
      console.error('Game data not loaded');
      return null;
    }

    const enemy = this.gameData.enemies[enemyKey];
    if (!enemy) return null;

    const lang = this.currentLanguage;
    const suffix = lang === 'ko' ? '_ko' : '_ja';

    return {
      ...enemy,
      name: enemy[`name${suffix}`],
      intent: enemy[`intent${suffix}`],
    };
  }

  // 스테이지 데이터 가져오기
  public getStageData(stageId: string) {
    if (!this.gameData) {
      console.error('Game data not loaded');
      return null;
    }

    const stage = this.gameData.stages[stageId];
    if (!stage) return null;

    const lang = this.currentLanguage;
    const suffix = lang === 'ko' ? '_ko' : '_ja';

    return {
      ...stage,
      name: stage[`name${suffix}`],
      description: stage[`description${suffix}`],
      type: this.translateStageType(stage.type),
    };
  }

  // 모든 스테이지 데이터 가져오기
  public getAllStageData() {
    if (!this.gameData) {
      console.error('Game data not loaded');
      return {};
    }

    const lang = this.currentLanguage;
    const suffix = lang === 'ko' ? '_ko' : '_ja';
    const result: any = {};

    Object.keys(this.gameData.stages).forEach((stageId) => {
      const stage = this.gameData!.stages[stageId];
      result[stageId] = {
        ...stage,
        name: stage[`name${suffix}`],
        description: stage[`description${suffix}`],
        type: this.translateStageType(stage.type),
      };
    });

    return result;
  }

  private translateStageType(type: string): string {
    const typeMap: Record<string, Record<Language, string>> = {
      normal: { ko: '일반', ja: 'ノーマル' },
      mid_boss: { ko: '중보스', ja: '中ボス' },
      boss: { ko: '보스', ja: 'ボス' },
    };
    return typeMap[type]?.[this.currentLanguage] || type;
  }
}

export default LanguageManager;
