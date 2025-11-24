/**
 * 텍스트 스타일 설정을 관리하는 싱글톤 클래스
 * public/data/textStyles.json에서 정의된 텍스트 스타일을 로드하고 적용합니다.
 */

import Phaser from 'phaser';

interface TextStyleConfig {
  fontSize?       : string;
  fontFamily?     : string;
  fontStyle?      : string;
  color?          : string;
  stroke?         : string;
  strokeThickness?: number;
  align?          : string;
  wordWrap?       : boolean | { width?: number };
  [key: string]   : any;
}

interface TextStyleData {
  [category: string]: {
    [name: string]: TextStyleConfig;
  };
}

export class TextStyleManager {
  private static instance: TextStyleManager;
  private config: TextStyleData | null = null;

  private constructor() {}

  public static getInstance(): TextStyleManager {
    if (!TextStyleManager.instance) {
      TextStyleManager.instance = new TextStyleManager();
    }
    return TextStyleManager.instance;
  }

  /**
   * 텍스트 스타일 설정을 로드합니다.
   */
  public async load(): Promise<void> {
    try {
      // Use import.meta.env.BASE_URL to handle GitHub Pages base path
      const basePath = import.meta.env.BASE_URL || '/';
      const url = `${basePath}data/textStyles.json`.replace('//', '/');
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load textStyles.json: ${response.statusText}`);
      }
      this.config = await response.json();
      console.log('Text styles loaded successfully');
    } catch (error) {
      console.error('Error loading text styles:', error);
      throw error;
    }
  }

  /**
   * 경로를 통해 텍스트 스타일 설정을 가져옵니다.
   * @param path 점으로 구분된 경로 (예: 'titles.main', 'buttons.primary')
   * @returns 텍스트 스타일 설정 객체 또는 null
   */
  public get(path: string): TextStyleConfig | null {
    if (!this.config) {
      console.warn('Text style config not loaded');
      return null;
    }

    const parts = path.split('.');
    if (parts.length !== 2) {
      console.warn(`Invalid text style path: ${path}`);
      return null;
    }

    const [category, name] = parts;
    const style = this.config[category]?.[name];

    if (!style) {
      console.warn(`Text style not found: ${path}`);
      return null;
    }

    return { ...style };
  }

  /**
   * 텍스트 스타일을 가져와서 추가 속성과 병합합니다.
   * Phaser.GameObjects.TextStyle과 호환되는 형식으로 반환합니다.
   * @param path 점으로 구분된 경로
   * @param overrides 덮어쓸 속성들
   * @returns 병합된 텍스트 스타일 설정
   */
  public getStyle(path: string, overrides?: Partial<TextStyleConfig>): Phaser.Types.GameObjects.Text.TextStyle {
    const baseStyle = this.get(path);

    if (!baseStyle) {
      console.warn(`Using default style for missing path: ${path}`);
      return (overrides || {}) as Phaser.Types.GameObjects.Text.TextStyle;
    }

    // 기본 스타일과 오버라이드 병합
    const merged = {
      ...baseStyle,
      ...overrides
    };

    // wordWrap 특별 처리: boolean인 경우 { width: number } 형식으로 변환
    if (merged.wordWrap === true) {
      merged.wordWrap = { width: 200 }; // 기본 너비
    } else if (merged.wordWrap === false) {
      delete merged.wordWrap; // false인 경우 제거
    } else if (merged.wordWrap && typeof merged.wordWrap === 'object') {
      // 이미 올바른 형식
    }

    return merged as Phaser.Types.GameObjects.Text.TextStyle;
  }
}

// 싱글톤 인스턴스 export
export const textStyle = TextStyleManager.getInstance();
