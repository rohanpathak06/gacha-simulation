import { CONFIG, PITY_CONFIG } from '../data/Config.js';

/**
 * State manager and core logic engine for the gacha simulator.
 * Handles PRNG rolling, pity accumulation, probability enforcement,
 * and persistent local application state.
 */
export class GachaSystem {
    /**
     * Initializes the GachaSystem and attempts to restore historical state from Storage.
     */
    constructor() {
        /** @type {Array<Object>} List of all historical pulls */
        this.history = [];
        /** @type {number} Total number of standard rolls executed */
        this.pullCount = 0;
        /** @type {{epic: number, legendary: number}} Tracking counters for soft/hard pity */
        this.pityCounter = {
            epic: 0,
            legendary: 0
        };
        this.loadState();
    }

    setPreset(presetName) {
        // In a real app we might reset metrics, but for comparison maybe keep them?
        // "Reset data" button exists separately.
        // Let's just switch the rates.
        // Note: Changing rates mid-stream affects 'Expected' calculations for the whole history?
        // Ideally, history items should store what rates they were pulled with if we want perfect accuracy.
        // For this demo, we will just change the current pulling logic.
    }

    // Helper to get current tiers
    getTiers() {
        return Object.values(CONFIG.current).sort((a, b) => a.rate - b.rate);
    }

    /**
     * Generates a single item roll, strictly evaluating hard/soft pity rules
     * before delegating to standard probability cumulative checks.
     * @returns {Object} The drawn item object.
     */
    roll() {
        // 1. Check Hard Pity (Legendary)
        // Only applies if Legendary exists in current preset (it does in all our presets)
        if (PITY_CONFIG.USE_PITY && this.pityCounter.legendary >= PITY_CONFIG.GUARANTEED_LEGENDARY_AT - 1) {
            this.resetPity('legendary');
            return CONFIG.current.LEGENDARY;
        }

        // 2. Perform Standard Roll
        const rand = Math.random();
        let cumulative = 0;
        const tiers = this.getTiers();

        let item = CONFIG.current.COMMON; // Default

        for (const tier of tiers) {
            cumulative += tier.rate;
            if (rand < cumulative) {
                item = tier;
                break;
            }
        }

        // 3. Check Soft Pity / Epic Pity
        if (PITY_CONFIG.USE_PITY && this.pityCounter.epic >= PITY_CONFIG.GUARANTEED_EPIC_AT - 1) {
            // Compare ranks. We need a way to know rank order.
            // Tiers are sorted by rate (ascending). Lower rate = Higher rank.
            // If item rate > Epic rate, it's worse. (e.g. Common 0.6 > Epic 0.035)
            if (item.rate > CONFIG.current.EPIC.rate) {
                item = CONFIG.current.EPIC;
            }
        }

        // 4. Update Pity
        this.updatePity(item);

        return item;
    }

    updatePity(item) {
        if (item.id === 'mythic' || item.id === 'legendary') {
            this.pityCounter.legendary = 0;
            this.pityCounter.epic = 0;
        } else if (item.id === 'epic') {
            this.pityCounter.epic = 0;
            this.pityCounter.legendary++;
        } else {
            this.pityCounter.epic++;
            this.pityCounter.legendary++;
        }
    }

    resetPity(tier) {
        if (tier === 'legendary') this.pityCounter.legendary = 0;
        if (tier === 'epic') this.pityCounter.epic = 0;
    }

    /**
     * Executes a batch of pulls (or single), updating total analytics.
     * @param {number} [amount=1] Number of items to pull simultaneously.
     * @returns {Array<Object>} Array containing the detailed results of the pull attempt.
     */
    pull(amount = 1) {
        const results = [];
        for (let i = 0; i < amount; i++) {
            const item = this.roll();
            const result = {
                ...item, // Copies name, id, color
                droppedAtRate: item.rate,
                timestamp: Date.now(),
                pullIndex: this.pullCount + i + 1,
                itemName: `${item.name} Item`
            };
            results.push(result);
        }

        this.pullCount += amount;
        this.updateHistory(results);
        this.saveState();

        return results;
    }

    updateHistory(newItems) {
        this.history.push(...newItems);
    }

    /**
     * Serializes current analytics to localStorage.
     * Limits history queue to 500 records to prevent QuotaExceeded errors during heavy operation.
     */
    saveState() {
        const state = {
            pullCount: this.pullCount,
            pityCounter: this.pityCounter
        };
        localStorage.setItem('gacha_state', JSON.stringify(state));
        
        try {
            // Keep at most the last 500 items to avoid running out of storage
            const historyToSave = this.history.slice(-500);
            localStorage.setItem('gacha_history', JSON.stringify(historyToSave));
        } catch (e) {
            console.warn('History memory limit approached', e);
        }
    }

    loadState() {
        const state = localStorage.getItem('gacha_state');
        if (state) {
            const parsed = JSON.parse(state);
            this.pullCount = parsed.pullCount || 0;
            this.pityCounter = parsed.pityCounter || { epic: 0, legendary: 0 };
        }
        const history = localStorage.getItem('gacha_history');
        if (history) {
            this.history = JSON.parse(history);
        }
    }

    /**
     * Purges all application statistics and removes them from the client browser completely.
     */
    reset() {
        this.history = [];
        this.pullCount = 0;
        this.pityCounter = { epic: 0, legendary: 0 };
        localStorage.removeItem('gacha_state');
        localStorage.removeItem('gacha_history');
    }
}
