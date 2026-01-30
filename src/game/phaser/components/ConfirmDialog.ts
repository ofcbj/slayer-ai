import Phaser from 'phaser';
import { textStyle } from '../managers/TextStyleManager';

export interface ConfirmDialogOptions {
  message: string;
  subMessage?: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

/**
 * 재사용 가능한 확인 다이얼로그
 * 모달 형태로 표시되며 확인/취소 버튼을 제공합니다.
 */
export default class ConfirmDialog {
  private scene: Phaser.Scene;
  private elements: Phaser.GameObjects.GameObject[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  show(options: ConfirmDialogOptions): void {
    const { width, height } = this.scene.cameras.main;

    // 오버레이
    const overlay = this.scene.add.rectangle(0, 0, width, height, 0x000000, 0.8);
    overlay.setOrigin(0);
    overlay.setDepth(2000);
    overlay.setInteractive();
    this.elements.push(overlay);

    // 다이얼로그 배경
    const dialogBg = this.scene.add.rectangle(width / 2, height / 2, 500, 300, 0x1e293b);
    dialogBg.setStrokeStyle(4, 0xef4444);
    dialogBg.setDepth(2001);
    this.elements.push(dialogBg);

    // 메인 메시지
    const messageText = this.scene.add.text(
      width / 2, height / 2 - 80,
      options.message,
      textStyle.getStyle('character.name', { fontSize: '24px' })
    ).setOrigin(0.5);
    messageText.setDepth(2002);
    this.elements.push(messageText);

    // 서브 메시지 (옵션)
    if (options.subMessage) {
      const subText = this.scene.add.text(
        width / 2, height / 2 - 30,
        options.subMessage,
        textStyle.getStyle('ui.label', { fontSize: '20px', color: '#fbbf24' })
      ).setOrigin(0.5);
      subText.setDepth(2002);
      this.elements.push(subText);
    }

    // 확인 버튼
    const confirmBtn = this.createButton(
      width / 2 - 80, height / 2 + 60,
      options.confirmLabel,
      0xef4444, 0xdc2626,
      () => {
        this.close();
        options.onConfirm();
      }
    );
    this.elements.push(confirmBtn);

    // 취소 버튼
    const cancelBtn = this.createButton(
      width / 2 + 80, height / 2 + 60,
      options.cancelLabel,
      0x64748b, 0x475569,
      () => {
        this.close();
        options.onCancel?.();
      }
    );
    this.elements.push(cancelBtn);
  }

  private createButton(
    x: number,
    y: number,
    label: string,
    bgColor: number,
    hoverColor: number,
    onClick: () => void
  ): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);
    container.setDepth(2002);

    const bg = this.scene.add.rectangle(0, 0, 120, 50, bgColor);
    bg.setStrokeStyle(3, hoverColor);

    const text = this.scene.add.text(0, 0, label, textStyle.getStyle('character.name'))
      .setOrigin(0.5);

    container.add([bg, text]);
    bg.setInteractive({ useHandCursor: true });

    bg.on('pointerover', () => bg.setFillStyle(hoverColor));
    bg.on('pointerout', () => bg.setFillStyle(bgColor));
    bg.on('pointerdown', onClick);

    return container;
  }

  close(): void {
    this.elements.forEach(el => el.destroy());
    this.elements = [];
  }
}
