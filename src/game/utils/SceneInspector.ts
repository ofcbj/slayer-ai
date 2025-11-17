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

    // Display List의 모든 오브젝트 수집
    const displayList = scene.children.list;
    sceneNode.children = displayList.map((obj, index) =>
      this.inspectGameObject(obj, index, 'root')
    );

    return sceneNode;
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
