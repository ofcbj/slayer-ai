import Phaser from 'phaser';

export interface GameObjectNode {
  id: string;
  type: string;
  name?: string;
  properties: Record<string, any>;
  children?: GameObjectNode[];
  gameObject?: Phaser.GameObjects.GameObject; // 실제 게임 오브젝트 참조
}

/**
 * Phaser Scene에서 게임 오브젝트를 추출하고 트리 구조로 변환합니다.
 */
export class SceneInspector {
  private static idCounter = 0;

  /**
   * Scene의 모든 게임 오브젝트를 트리 구조로 반환
   */
  static inspectScene(scene: Phaser.Scene | null): GameObjectNode | null {
    if (!scene) return null;

    // ID 카운터 리셋
    this.idCounter = 0;

    const sceneNode: GameObjectNode = {
      id: 'scene',
      type: 'Scene',
      name: scene.scene.key,
      properties: {
        key: scene.scene.key,
        active: scene.scene.isActive(),
        visible: scene.scene.isVisible(),
        isPaused: scene.scene.isPaused(),
      },
      children: []
    };

    // Managers 노드 추가 (BattleScene인 경우)
    const managersNode = this.inspectManagers(scene);
    if (managersNode) {
      sceneNode.children!.push(managersNode);
    }

    // Display List의 모든 오브젝트 수집
    const displayList = scene.children.list;
    const gameObjects = displayList.map((obj, index) =>
      this.inspectGameObject(obj, index, 'root')
    );
    sceneNode.children!.push(...gameObjects);

    return sceneNode;
  }

  /**
   * Scene의 매니저들 상태 추출
   */
  private static inspectManagers(scene: any): GameObjectNode | null {
    const sceneAny = scene as any;

    // 매니저 이름 패턴 정의
    const managerPatterns = [
      'Manager', 'manager', 'Handler', 'handler',
      'Controller', 'controller', 'Service', 'service'
    ];

    // Scene의 모든 프로퍼티 중 매니저로 보이는 것들 찾기
    const managerKeys = Object.keys(sceneAny).filter(key => {
      const value = sceneAny[key];
      // null이 아니고, 객체이며, 매니저 패턴에 매칭되는 것
      return value &&
             typeof value === 'object' &&
             managerPatterns.some(pattern => key.includes(pattern));
    });

    if (managerKeys.length === 0) {
      return null;
    }

    const managersNode: GameObjectNode = {
      id: 'managers',
      type: 'Managers',
      name: 'Scene Managers',
      properties: {
        description: 'All scene managers and their states',
        count: managerKeys.length,
      },
      children: [],
    };

    // 각 매니저를 제네릭하게 추출
    managerKeys.forEach((key, index) => {
      const manager = sceneAny[key];
      managersNode.children!.push(this.inspectGenericManager(manager, key, index));
    });

    return managersNode;
  }

  /**
   * 제네릭 매니저 상태 추출
   */
  private static inspectGenericManager(manager: any, name: string, index: number): GameObjectNode {
    // 매니저 타입 추론 (클래스 이름 또는 constructor.name)
    const typeName = manager.constructor?.name || name;

    const node: GameObjectNode = {
      id: `manager-${index}-${name}`,
      type: typeName,
      name: this.formatManagerName(name),
      properties: {},
      children: [],
    };

    // 매니저의 모든 속성을 자동으로 추출
    this.extractObjectProperties(manager, node.properties);

    return node;
  }

  /**
   * 객체의 속성들을 재귀적으로 추출
   */
  private static extractObjectProperties(obj: any, target: Record<string, any>, depth: number = 0, maxDepth: number = 3): void {
    if (!obj || typeof obj !== 'object' || depth >= maxDepth) {
      return;
    }

    // 순환 참조 방지를 위한 Set
    const seen = new WeakSet();

    const extractValue = (value: any, currentDepth: number): any => {
      // null이나 undefined
      if (value === null || value === undefined) {
        return value;
      }

      // 기본 타입
      const type = typeof value;
      if (type === 'string' || type === 'number' || type === 'boolean') {
        return value;
      }

      // 함수는 제외
      if (type === 'function') {
        return undefined;
      }

      // 배열
      if (Array.isArray(value)) {
        if (currentDepth >= maxDepth) {
          return `[Array(${value.length})]`;
        }
        // 배열이 너무 크면 요약
        if (value.length > 10) {
          return `[Array(${value.length})]`;
        }
        return value.map(item => extractValue(item, currentDepth + 1));
      }

      // Phaser 게임 오브젝트는 간단히 표현
      if (value.type && value.scene) {
        return `[GameObject: ${value.type}]`;
      }

      // Scene 객체는 참조만
      if (value.scene && value.sys) {
        return '[Scene]';
      }

      // 순환 참조 체크
      if (seen.has(value)) {
        return '[Circular]';
      }

      // 객체
      if (type === 'object') {
        if (currentDepth >= maxDepth) {
          return '[Object]';
        }

        seen.add(value);

        const result: Record<string, any> = {};
        const keys = Object.keys(value);

        // 너무 많은 키가 있으면 제한
        const limitedKeys = keys.slice(0, 20);

        for (const key of limitedKeys) {
          // private 필드 제외 (언더스코어로 시작)
          if (key.startsWith('_')) continue;

          try {
            const propValue = value[key];
            const extracted = extractValue(propValue, currentDepth + 1);
            if (extracted !== undefined) {
              result[key] = extracted;
            }
          } catch (e) {
            // 접근 불가능한 속성은 스킵
          }
        }

        if (keys.length > limitedKeys.length) {
          result['...'] = `(${keys.length - limitedKeys.length} more)`;
        }

        return result;
      }

      return String(value);
    };

    // 객체의 모든 키를 순회
    const keys = Object.keys(obj);
    for (const key of keys) {
      // private 필드 제외
      if (key.startsWith('_')) continue;

      // Phaser 내부 속성 제외
      if (key === 'scene' || key === 'sys') continue;

      try {
        const value = obj[key];
        const extracted = extractValue(value, depth);

        if (extracted !== undefined) {
          target[key] = extracted;
        }
      } catch (e) {
        // 접근 불가능한 속성은 스킵
      }
    }
  }

  /**
   * 매니저 이름을 보기 좋게 포맷
   */
  private static formatManagerName(name: string): string {
    // camelCase를 Title Case로 변환
    return name
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  /**
   * 개별 게임 오브젝트를 노드로 변환
   */
  private static inspectGameObject(
    obj: Phaser.GameObjects.GameObject,
    index: number,
    parentPath: string
  ): GameObjectNode {
    const uniqueId = `${parentPath}-${index}-${obj.type}-${this.idCounter++}`;
    const node: GameObjectNode = {
      id: uniqueId,
      type: obj.type,
      name: (obj as any).name || `${obj.type}_${index}`,
      properties: this.extractProperties(obj),
      gameObject: obj, // 실제 오브젝트 참조 저장
    };

    // Container의 경우 자식 오브젝트도 수집
    if (obj.type === 'Container') {
      const container = obj as Phaser.GameObjects.Container;
      node.children = container.list.map((child, childIndex) =>
        this.inspectGameObject(child, childIndex, uniqueId)
      );
    }

    return node;
  }

  /**
   * 게임 오브젝트의 주요 속성 추출
   */
  private static extractProperties(obj: Phaser.GameObjects.GameObject): Record<string, any> {
    const props: Record<string, any> = {
      type: obj.type,
      active: obj.active,
      visible: obj.visible,
    };

    // Transform 속성
    if ('x' in obj && 'y' in obj) {
      props.position = {
        x: (obj as any).x,
        y: (obj as any).y,
      };
    }

    if ('scaleX' in obj && 'scaleY' in obj) {
      props.scale = {
        x: (obj as any).scaleX,
        y: (obj as any).scaleY,
      };
    }

    if ('rotation' in obj) {
      props.rotation = (obj as any).rotation;
    }

    if ('angle' in obj) {
      props.angle = (obj as any).angle;
    }

    // 크기 속성
    if ('width' in obj && 'height' in obj) {
      props.size = {
        width: (obj as any).width,
        height: (obj as any).height,
      };
    }

    // 투명도
    if ('alpha' in obj) {
      props.alpha = (obj as any).alpha;
    }

    // 텍스트 오브젝트 특수 속성
    if (obj.type === 'Text') {
      const text = obj as Phaser.GameObjects.Text;
      props.text = text.text;
      props.fontSize = text.style.fontSize;
      props.color = text.style.color;
    }

    // 스프라이트 특수 속성
    if (obj.type === 'Sprite' || obj.type === 'Image') {
      const sprite = obj as Phaser.GameObjects.Sprite;
      if (sprite.texture) {
        props.texture = sprite.texture.key;
      }
      if (sprite.frame) {
        props.frame = sprite.frame.name;
      }
    }

    // Graphics 특수 속성
    if (obj.type === 'Graphics') {
      props.fillStyle = 'Graphics Object';
    }

    // Container 특수 속성
    if (obj.type === 'Container') {
      const container = obj as Phaser.GameObjects.Container;
      props.childCount = container.list.length;
    }

    // Rectangle 특수 속성
    if (obj.type === 'Rectangle') {
      const rect = obj as Phaser.GameObjects.Rectangle;
      props.fillColor = `#${rect.fillColor.toString(16).padStart(6, '0')}`;
      props.fillAlpha = rect.fillAlpha;
    }

    // Arc/Circle 특수 속성
    if (obj.type === 'Arc') {
      const arc = obj as Phaser.GameObjects.Arc;
      props.radius = arc.radius;
      props.fillColor = `#${arc.fillColor.toString(16).padStart(6, '0')}`;
      props.fillAlpha = arc.fillAlpha;
    }

    return props;
  }

  /**
   * Registry 데이터 추출
   */
  static inspectRegistry(scene: Phaser.Scene | null): Record<string, any> {
    if (!scene) return {};

    const registry = scene.registry;
    const data: Record<string, any> = {};

    // Registry의 모든 키를 순회
    registry.list.forEach((value: any, key: string) => {
      data[key] = value;
    });

    return data;
  }

  /**
   * Scene의 Physics 오브젝트 정보 추출
   */
  static inspectPhysics(scene: Phaser.Scene | null): any {
    if (!scene || !scene.physics) return null;

    const physics = scene.physics.world;

    return {
      enabled: true,
      gravity: {
        x: physics.gravity.x,
        y: physics.gravity.y,
      },
      bodies: physics.bodies.size,
      fps: physics.fps,
      isPaused: physics.isPaused,
    };
  }
}
