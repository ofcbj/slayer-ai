import Phaser from 'phaser';

/**
 * 게임 오브젝트를 시각적으로 하이라이트하는 유틸리티
 */
export class ObjectHighlighter {
  private static highlightGraphics: Phaser.GameObjects.Graphics | null = null;
  private static currentScene: Phaser.Scene | null = null;

  /**
   * 하이라이트 초기화
   */
  static initialize(scene: Phaser.Scene) {
    this.currentScene = scene;

    // 기존 하이라이트 제거
    if (this.highlightGraphics) {
      this.highlightGraphics.destroy();
    }

    // 새 Graphics 객체 생성 (최상위 레이어)
    this.highlightGraphics = scene.add.graphics();
    this.highlightGraphics.setDepth(10000); // 가장 위에 표시
  }

  /**
   * 게임 오브젝트를 하이라이트
   */
  static highlight(obj: Phaser.GameObjects.GameObject) {
    if (!this.highlightGraphics || !this.currentScene) {
      return;
    }

    // 기존 그래픽 클리어
    this.highlightGraphics.clear();

    // 오브젝트의 bounds 계산
    const bounds = this.getObjectBounds(obj);
    if (!bounds) {
      return;
    }

    // 하이라이트 그리기 (노란색 윤곽선)
    this.highlightGraphics.lineStyle(3, 0xffff00, 1);
    this.highlightGraphics.strokeRect(
      bounds.x,
      bounds.y,
      bounds.width,
      bounds.height
    );

    // 반투명 배경
    this.highlightGraphics.fillStyle(0xffff00, 0.1);
    this.highlightGraphics.fillRect(
      bounds.x,
      bounds.y,
      bounds.width,
      bounds.height
    );

    // 중심점 표시
    this.highlightGraphics.fillStyle(0xff0000, 1);
    this.highlightGraphics.fillCircle(bounds.centerX, bounds.centerY, 5);

    // 깜빡임 애니메이션
    this.currentScene.tweens.add({
      targets: this.highlightGraphics,
      alpha: { from: 1, to: 0.3 },
      duration: 500,
      yoyo: true,
      repeat: 2,
    });
  }

  /**
   * 하이라이트 제거
   */
  static clear() {
    if (this.highlightGraphics) {
      this.highlightGraphics.clear();
    }
  }

  /**
   * 게임 오브젝트의 경계 상자 계산
   */
  private static getObjectBounds(obj: Phaser.GameObjects.GameObject): {
    x: number;
    y: number;
    width: number;
    height: number;
    centerX: number;
    centerY: number;
  } | null {
    // Transform 컴포넌트가 있는지 확인
    if (!('x' in obj) || !('y' in obj)) {
      return null;
    }

    const transform = obj as any;

    // 월드 좌표 계산 (부모 Container의 변환 포함)
    let worldX = transform.x || 0;
    let worldY = transform.y || 0;

    // parentContainer가 있으면 월드 좌표로 변환
    if (transform.parentContainer) {
      const worldTransform = transform.getWorldTransformMatrix();
      worldX = worldTransform.tx;
      worldY = worldTransform.ty;
    }

    let x = worldX;
    let y = worldY;
    let width = 0;
    let height = 0;

    // 타입별로 크기 계산
    if (obj.type === 'Rectangle') {
      const rect = obj as Phaser.GameObjects.Rectangle;
      width = rect.width * Math.abs(rect.scaleX);
      height = rect.height * Math.abs(rect.scaleY);
      x = worldX - (width * rect.originX);
      y = worldY - (height * rect.originY);
    } else if (obj.type === 'Arc' || obj.type === 'Circle') {
      const arc = obj as Phaser.GameObjects.Arc;
      const radius = arc.radius * Math.abs(arc.scaleX);
      width = radius * 2;
      height = radius * 2;
      x = worldX - radius;
      y = worldY - radius;
    } else if (obj.type === 'Text') {
      const text = obj as Phaser.GameObjects.Text;
      width = text.width * Math.abs(text.scaleX);
      height = text.height * Math.abs(text.scaleY);
      x = worldX - (width * text.originX);
      y = worldY - (height * text.originY);
    } else if (obj.type === 'Sprite' || obj.type === 'Image') {
      const sprite = obj as Phaser.GameObjects.Sprite;
      width = sprite.displayWidth;
      height = sprite.displayHeight;
      x = worldX - (width * sprite.originX);
      y = worldY - (height * sprite.originY);
    } else if (obj.type === 'Container') {
      const container = obj as Phaser.GameObjects.Container;
      const bounds = container.getBounds();
      x = bounds.x;
      y = bounds.y;
      width = bounds.width;
      height = bounds.height;
    } else if (obj.type === 'Graphics') {
      // Graphics는 bounds를 정확히 계산하기 어려움
      width = 100;
      height = 100;
      x = worldX - 50;
      y = worldY - 50;
    } else if ('width' in transform && 'height' in transform) {
      // 일반적인 경우
      width = (transform.width || 50) * Math.abs(transform.scaleX || 1);
      height = (transform.height || 50) * Math.abs(transform.scaleY || 1);
      x = worldX - ((width * (transform.originX || 0.5)));
      y = worldY - ((height * (transform.originY || 0.5)));
    } else {
      // 크기를 알 수 없는 경우 기본값
      width = 50;
      height = 50;
      x = worldX - 25;
      y = worldY - 25;
    }

    return {
      x,
      y,
      width,
      height,
      centerX: x + width / 2,
      centerY: y + height / 2,
    };
  }

  /**
   * 정리
   */
  static destroy() {
    if (this.highlightGraphics) {
      this.highlightGraphics.destroy();
      this.highlightGraphics = null;
    }
    this.currentScene = null;
  }
}
