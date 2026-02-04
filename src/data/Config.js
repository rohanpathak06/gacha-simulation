export const PRESETS = {
    STANDARD: {
        COMMON: { id: 'common', name: 'Common', rate: 0.60, color: '#b0b0b0' },
        UNCOMMON: { id: 'uncommon', name: 'Uncommon', rate: 0.25, color: '#4caf50' },
        RARE: { id: 'rare', name: 'Rare', rate: 0.10, color: '#2196f3' },
        EPIC: { id: 'epic', name: 'Epic', rate: 0.035, color: '#9c27b0' },
        LEGENDARY: { id: 'legendary', name: 'Legendary', rate: 0.013, color: '#ffc107' },
        MYTHIC: { id: 'mythic', name: 'Mythic', rate: 0.002, color: '#ff0055' }
    },
    GENEROUS: {
        COMMON: { id: 'common', name: 'Trash', rate: 0.40, color: '#b0b0b0' },
        UNCOMMON: { id: 'uncommon', name: 'Normal', rate: 0.30, color: '#4caf50' },
        RARE: { id: 'rare', name: 'Cool', rate: 0.15, color: '#2196f3' },
        EPIC: { id: 'epic', name: 'Super', rate: 0.10, color: '#9c27b0' },
        LEGENDARY: { id: 'legendary', name: 'Hyper', rate: 0.04, color: '#ffc107' },
        MYTHIC: { id: 'mythic', name: 'ULTRA', rate: 0.01, color: '#ff0055' }
    },
    PREDATORY: {
        COMMON: { id: 'common', name: 'Junk', rate: 0.80, color: '#787878' },
        UNCOMMON: { id: 'uncommon', name: 'Basic', rate: 0.15, color: '#555' },
        RARE: { id: 'rare', name: 'Rare', rate: 0.04, color: '#2196f3' },
        EPIC: { id: 'epic', name: 'Epic', rate: 0.008, color: '#9c27b0' },
        LEGENDARY: { id: 'legendary', name: 'Legend', rate: 0.0019, color: '#ffc107' },
        MYTHIC: { id: 'mythic', name: 'GOD', rate: 0.0001, color: '#ff0055' }
    }
};

export const CONFIG = {
    // Deep copy to allow mutation if needed, or just reference
    // Initial state standard
    current: PRESETS.STANDARD,

    setPityConfig: (mode) => {
        // Could adjust pity based on preset
    }
};

export const PITY_CONFIG = {
    USE_PITY: true,
    GUARANTEED_EPIC_AT: 10,
    GUARANTEED_LEGENDARY_AT: 90
};
