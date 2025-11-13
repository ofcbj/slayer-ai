// 데이터 로딩 유틸리티
class DataLoader {
    constructor() {
        this.cache = {};
    }

    async loadJSON(path) {
        if (this.cache[path]) {
            return this.cache[path];
        }

        try {
            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`Failed to load ${path}: ${response.status}`);
            }
            const data = await response.json();
            this.cache[path] = data;
            return data;
        } catch (error) {
            console.error(`Error loading ${path}:`, error);
            throw error;
        }
    }

    async loadAllGameData() {
        const [enemies, stages, bossPatterns, cards] = await Promise.all([
            this.loadJSON('./data/enemies.json'),
            this.loadJSON('./data/stages.json'),
            this.loadJSON('./data/boss-patterns.json'),
            this.loadJSON('./data/cards.json')
        ]);

        return {
            enemies,
            stages,
            bossPatterns,
            cards
        };
    }

    clearCache() {
        this.cache = {};
    }
}

export default DataLoader;
