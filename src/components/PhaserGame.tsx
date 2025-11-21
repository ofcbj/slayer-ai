import { forwardRef, useEffect, useLayoutEffect, useRef } from 'react';
import { StartGame } from '../game/main';
import EventBus from '../game/EventBus';

export interface IRefPhaserGame {
  game: Phaser.Game | null;
  scene: Phaser.Scene | null;
}

interface PhaserGameProps {
  currentActiveScene?: (scene: Phaser.Scene) => void;
}

/**
 * PhaserGame 컴포넌트
 * React와 Phaser를 연결하는 브릿지 역할을 합니다.
 */
export const PhaserGame = forwardRef<IRefPhaserGame, PhaserGameProps> (
  function PhaserGame({ currentActiveScene }, ref) {
    const gameRef = useRef<Phaser.Game | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    useLayoutEffect(() => {
      if (gameRef.current === null) {
        gameRef.current = StartGame('game-container');

        if (typeof ref === 'function') {
          ref({ game: gameRef.current, scene: null });
        } else if (ref) {
          ref.current = { game: gameRef.current, scene: null };
        }

        // 게임 컨테이너에 포커스를 주어 키보드 입력을 받을 수 있도록 함
        if (containerRef.current) {
          containerRef.current.focus();
        }
      }

      return () => {
        if (gameRef.current) {
          gameRef.current.destroy(true);
          gameRef.current = null;
        }
      };
    }, [ref]);

    useEffect(() => {
      EventBus.on('current-scene-ready', (scene: Phaser.Scene) => {
        if (currentActiveScene) {
          currentActiveScene(scene);
        }

        if (typeof ref === 'function') {
          ref({ game: gameRef.current, scene });
        } else if (ref) {
          ref.current = { game: gameRef.current, scene };
        }
      });

      return () => {
        EventBus.removeListener('current-scene-ready');
      };
    }, [currentActiveScene, ref]);

    return <div id="game-container" ref={containerRef} tabIndex={0} />;
  }
);
