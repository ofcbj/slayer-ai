import { Events } from 'phaser';

/**
 * EventBus는 React와 Phaser 간 통신을 위한 전역 이벤트 시스템입니다.
 *
 * 사용법:
 * ```typescript
 * // 이벤트 발송
 * EventBus.emit('event-name', data);
 *
 * // 이벤트 수신
 * EventBus.on('event-name', (data) => {
 *   console.log(data);
 * });
 *
 * // 이벤트 리스너 제거
 * EventBus.off('event-name', callback);
 * ```
 */
const EventBus = new Events.EventEmitter();

export default EventBus;
