import commonKo from '../locales/ko/common.json';
import commonJa from '../locales/ja/common.json';

export type Language = 'ko' | 'ja';

interface CommonTranslations {
  [key: string]: any;
}

/**
 * 언어 관리 클래스 (i18n 전담)
 * 번역 텍스트 제공 및 언어 전환 관리
 */
class LanguageManager {
  private static instance: LanguageManager;
  private currentLanguage: Language = 'ko';
  private commonTranslations: Record<Language, CommonTranslations> = {
    ko: commonKo,
    ja: commonJa,
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

  public getLanguage(): Language {
    return this.currentLanguage;
  }

  public setLanguage(lang: Language): void {
    this.currentLanguage = lang;
    localStorage.setItem('language', lang);
  }

  /**
   * 번역 텍스트 가져오기
   * @param path 점(.)으로 구분된 경로 (예: 'ui.endTurn')
   * @param variables 보간할 변수들 (예: { count: 5 })
   */
  public t(path: string, variables?: Record<string, any>): string {
    const keys = path.split('.');
    let value: any = this.commonTranslations[this.currentLanguage];

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        console.warn(`Translation not found: ${path}`);
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
}

export default LanguageManager;
