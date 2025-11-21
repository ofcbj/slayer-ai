import type Phaser from 'phaser';

/**
 * Tween configuration interface
 */
interface TweenConfig {
  duration: number;
  ease?: string;
  yoyo?: boolean;
  repeat?: number;
  properties: Record<string, number>;
}

/**
 * Tween configuration data structure
 */
interface TweenConfigData {
  interactive: Record<string, TweenConfig>;
  combat: Record<string, TweenConfig>;
  ui: Record<string, TweenConfig>;
  cards: Record<string, TweenConfig>;
  transitions: Record<string, TweenConfig>;
  particles: Record<string, TweenConfig>;
}

/**
 * Singleton manager for loading and applying tween configurations from JSON
 */
export class TweenConfigManager {
  private static instance: TweenConfigManager;
  private config: TweenConfigData | null = null;
  private isLoaded = false;

  private constructor() {}

  /**
   * Get the singleton instance
   */
  public static getInstance(): TweenConfigManager {
    if (!TweenConfigManager.instance) {
      TweenConfigManager.instance = new TweenConfigManager();
    }
    return TweenConfigManager.instance;
  }

  /**
   * Load tween configuration from JSON file
   */
  public async load(): Promise<void> {
    if (this.isLoaded) {
      return;
    }

    try {
      // Use import.meta.env.BASE_URL to handle GitHub Pages base path
      const basePath = import.meta.env.BASE_URL || '/';
      const url = `${basePath}data/tween.json`.replace('//', '/');
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load tween.json: ${response.statusText}`);
      }
      this.config = await response.json();
      this.isLoaded = true;
      console.log('TweenConfigManager: Configuration loaded successfully');
    } catch (error) {
      console.error('TweenConfigManager: Failed to load configuration', error);
      throw error;
    }
  }

  /**
   * Get a specific tween configuration
   * @param path - Dot-notation path to the config (e.g., 'ui.energyPulse')
   * @returns The tween configuration or null if not found
   */
  public get(path: string): TweenConfig | null {
    if (!this.isLoaded || !this.config) {
      console.warn('TweenConfigManager: Configuration not loaded yet');
      return null;
    }

    const parts = path.split('.');
    if (parts.length !== 2) {
      console.warn(`TweenConfigManager: Invalid path format "${path}". Expected format: "category.name"`);
      return null;
    }

    const [category, name] = parts;
    const categoryConfig = this.config[category as keyof TweenConfigData];

    if (!categoryConfig) {
      console.warn(`TweenConfigManager: Category "${category}" not found`);
      return null;
    }

    const tweenConfig = categoryConfig[name];
    if (!tweenConfig) {
      console.warn(`TweenConfigManager: Tween "${name}" not found in category "${category}"`);
      return null;
    }

    return tweenConfig;
  }

  /**
   * Apply a tween configuration to targets
   * @param scene - Phaser scene to create the tween in
   * @param path - Dot-notation path to the config (e.g., 'ui.energyPulse')
   * @param targets - The target object(s) to animate
   * @param overrides - Optional overrides for the configuration
   * @returns The created tween or null if config not found
   */
  public apply(
    scene: Phaser.Scene,
    path: string,
    targets: any,
    overrides?: Partial<Phaser.Types.Tweens.TweenBuilderConfig>
  ): Phaser.Tweens.Tween | null {
    const config = this.get(path);
    if (!config) {
      return null;
    }

    // Build the tween configuration
    const tweenConfig: Phaser.Types.Tweens.TweenBuilderConfig = {
      targets,
      duration: config.duration,
      ...overrides
    };

    // Add optional properties
    if (config.ease) {
      tweenConfig.ease = config.ease;
    }
    if (config.yoyo !== undefined) {
      tweenConfig.yoyo = config.yoyo;
    }
    if (config.repeat !== undefined) {
      tweenConfig.repeat = config.repeat;
    }

    // Apply properties with offset handling
    for (const [key, value] of Object.entries(config.properties)) {
      if (key === 'xOffset' && targets.x !== undefined) {
        tweenConfig.x = targets.x + value;
      } else if (key === 'yOffset' && targets.y !== undefined) {
        tweenConfig.y = targets.y + value;
      } else {
        tweenConfig[key as keyof Phaser.Types.Tweens.TweenBuilderConfig] = value as any;
      }
    }

    return scene.tweens.add(tweenConfig);
  }

  /**
   * Apply a tween with stagger delay (useful for arrays of targets)
   * @param scene - Phaser scene to create the tween in
   * @param path - Dot-notation path to the config
   * @param targets - Array of target objects
   * @param staggerDelay - Delay between each target's animation
   * @param overrides - Optional overrides for the configuration
   */
  public applyStaggered(
    scene: Phaser.Scene,
    path: string,
    targets: any[],
    staggerDelay: number,
    overrides?: Partial<Phaser.Types.Tweens.TweenBuilderConfig>
  ): Phaser.Tweens.Tween[] {
    const tweens: Phaser.Tweens.Tween[] = [];

    targets.forEach((target, index) => {
      const tween = this.apply(scene, path, target, {
        delay: index * staggerDelay,
        ...overrides
      });
      if (tween) {
        tweens.push(tween);
      }
    });

    return tweens;
  }

  /**
   * Check if the configuration is loaded
   */
  public isConfigLoaded(): boolean {
    return this.isLoaded;
  }

  /**
   * Get the raw configuration (for debugging)
   */
  public getRawConfig(): TweenConfigData | null {
    return this.config;
  }
}

// Export a convenient singleton instance
export const tweenConfig = TweenConfigManager.getInstance();
