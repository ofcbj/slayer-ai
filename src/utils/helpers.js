// 유틸리티 함수들

// 배열 섞기 (Fisher-Yates 알고리즘)
export function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// 배열에서 랜덤 요소 선택
export function getRandomElements(array, count) {
    const shuffled = shuffleArray(array);
    return shuffled.slice(0, Math.min(count, array.length));
}

// 지연 함수
export function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 깊은 복사
export function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

// 범위 내 값으로 제한
export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

// 객체의 특정 키만 선택
export function pick(obj, keys) {
    return keys.reduce((result, key) => {
        if (obj.hasOwnProperty(key)) {
            result[key] = obj[key];
        }
        return result;
    }, {});
}

// 디바운스 함수
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// DOM 요소 생성 헬퍼
export function createElement(tag, className, attributes = {}) {
    const element = document.createElement(tag);
    if (className) {
        element.className = className;
    }
    Object.entries(attributes).forEach(([key, value]) => {
        element.setAttribute(key, value);
    });
    return element;
}

// 이벤트 위임 헬퍼
export function delegate(parent, selector, eventType, handler) {
    parent.addEventListener(eventType, (event) => {
        const target = event.target.closest(selector);
        if (target && parent.contains(target)) {
            handler.call(target, event);
        }
    });
}

// 안전한 숫자 계산
export function safeMath(operation, a, b, min = 0, max = Infinity) {
    let result;
    switch (operation) {
        case 'add':
            result = a + b;
            break;
        case 'subtract':
            result = a - b;
            break;
        case 'multiply':
            result = a * b;
            break;
        case 'divide':
            result = b !== 0 ? a / b : 0;
            break;
        default:
            result = a;
    }
    return clamp(result, min, max);
}

export default {
    shuffleArray,
    getRandomElements,
    delay,
    deepClone,
    clamp,
    pick,
    debounce,
    createElement,
    delegate,
    safeMath
};
