import commonKo from '../locales/ko/common.json';
import commonJa from '../locales/ja/common.json';
import cardsKo from '../locales/ko/cards.json';
import cardsJa from '../locales/ja/cards.json';
import enemiesKo from '../locales/ko/enemies.json';
import enemiesJa from '../locales/ja/enemies.json';
import stagesKo from '../locales/ko/stages.json';
import stagesJa from '../locales/ja/stages.json';

export type Language = 'ko' | 'ja';

interface Translations {
  common: any;
  cards: any;
  enemies: any;
  stages: any;
}

class LanguageManager {
  private static instance: LanguageManager;
  private currentLanguage: Language = 'ko';
  private translations: Record<Language, Translations> = {
    ko: {
      common: commonKo,
      cards: cardsKo,
      enemies: enemiesKo,
      stages: stagesKo,
    },
    ja: {
      common: commonJa,
      cards: cardsJa,
      enemies: enemiesJa,
      stages: stagesJa,
    },
  };

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

  public t(path: string, variables?: Record<string, any>): string {
    const keys = path.split('.');
    // Start from 'common' namespace by default
    let value: any = this.translations[this.currentLanguage].common;

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

  public getCardData() {
    return this.translations[this.currentLanguage].cards;
  }

  public getEnemyData(enemyKey: string) {
    return this.translations[this.currentLanguage].enemies[enemyKey];
  }

  public getStageData(stageId: string) {
    return this.translations[this.currentLanguage].stages[stageId];
  }

  public getAllStageData() {
    return this.translations[this.currentLanguage].stages;
  }
}

export default LanguageManager;
