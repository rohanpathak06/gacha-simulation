import { CONFIG, PRESETS } from '../data/Config.js';

export class Renderer {
    constructor() {
        this.els = {
            resultsArea: document.getElementById('results-area'),
            totalPulls: document.getElementById('total-pulls'),
            totalCost: document.getElementById('total-cost'),
            statsGrid: document.getElementById('stats-grid'),
            barChart: document.getElementById('bar-chart'),
            pityStatus: document.getElementById('pity-count-display'),
            calculator: document.getElementById('prob-calc-result')
        };

        this.initStatsGrid();
    }

    initStatsGrid() {
        this.els.statsGrid.innerHTML = '';
        // Use current config
        const tiers = Object.values(CONFIG.current).sort((a, b) => a.rate - b.rate).reverse();

        tiers.forEach(tier => {
            const card = document.createElement('div');
            card.className = 'stat-card';
            card.innerHTML = `
        <div class="stat-title" style="color: ${tier.color}">${tier.name}</div>
        <div class="stat-value" id="count-${tier.id}">0</div>
        <div class="stat-sub">
            Real: <span id="real-${tier.id}">0.0%</span> 
            (Exp: ${(tier.rate * 100).toFixed(2)}%)
        </div>
      `;
            this.els.statsGrid.appendChild(card);
        });
    }

    renderPullResults(items) {
        this.els.resultsArea.innerHTML = '';
        items.forEach((item, index) => {
            const card = document.createElement('div');
            card.className = `item-card rarity-${item.id}`;
            // Fix Border Color manually if dynamic styles not set, but we use class names matching IDs.
            // We need to ensure dynamic presets use standard IDs (common, rare, etc) or update CSS.
            // My Config presets use standard IDs but different names/rates. So CSS classes rarity-common etc work.

            // Dynamic color override if needed
            card.style.borderColor = item.color;

            card.style.animationDelay = `${index * 0.1}s`;

            card.innerHTML = `
        <div class="item-visual" style="background: ${item.color}"></div>
        <div class="item-name">${item.name}<br>Item</div>
      `;
            this.els.resultsArea.appendChild(card);
        });
    }

    updateStats(system) {
        this.els.totalPulls.textContent = system.pullCount;
        const cost = system.pullCount * 2;
        this.els.totalCost.textContent = `$${cost.toLocaleString()}`;

        // Calculate Counts
        const counts = {};
        Object.values(CONFIG.current).forEach(r => counts[r.id] = 0);

        // Scan history. Note: History items might come from different presets, 
        // but we map them to current IDs if possible or just count them.
        system.history.forEach(item => {
            // If item ID exists in current config, increment.
            if (counts[item.id] !== undefined) counts[item.id]++;
        });

        Object.values(CONFIG.current).forEach(tier => {
            const count = counts[tier.id] || 0;
            const total = system.pullCount || 1;
            const percentage = ((count / total) * 100).toFixed(2);

            const countEl = document.getElementById(`count-${tier.id}`);
            if (countEl) countEl.textContent = count;

            const realEl = document.getElementById(`real-${tier.id}`);
            if (realEl) {
                realEl.textContent = `${percentage}%`;
                // Update Expected text too in case it changed
                // Actually hard to update the (Exp: X%) part without rebuilding or specific span.
                // Let's just rebuild grid if preset changes, otherwise just update numbers.
            }
        });

        this.els.pityStatus.textContent = system.pityCounter.legendary;
        this.renderChart(counts, system.pullCount);
    }

    renderChart(counts, total) {
        if (total === 0) {
            this.els.barChart.innerHTML = '';
            return;
        }

        this.els.barChart.innerHTML = '';
        const tiers = Object.values(CONFIG.current).sort((a, b) => a.rate - b.rate); // Ascending for chart order
        // Focus on top tiers?
        const interestingTiers = tiers.filter(t => t.rate < 0.2); // Hide Common/Uncommon

        interestingTiers.forEach(tier => {
            const count = counts[tier.id] || 0;
            const realRate = count / total;
            const expectedRate = tier.rate;

            // Scale relative to 2x expected (so if you have 2x luck, bar is full)
            // or just clamp at some reasonable max like 20%
            const maxScale = Math.max(tier.rate * 3, 0.05);

            const realH = Math.min((realRate / maxScale) * 100, 100);
            const expH = Math.min((expectedRate / maxScale) * 100, 100);

            const group = document.createElement('div');
            group.className = 'bar-group';

            const bar = document.createElement('div');
            bar.className = 'bar';
            bar.style.height = `${realH}%`;
            bar.style.backgroundColor = tier.color;
            bar.title = `${tier.name}: ${(realRate * 100).toFixed(2)}%`;

            const marker = document.createElement('div');
            marker.style.position = 'absolute';
            marker.style.bottom = `${expH}%`;
            marker.style.left = 0;
            marker.style.right = 0;
            marker.style.borderTop = '2px dashed #fff';
            marker.style.opacity = '0.5';
            bar.appendChild(marker);

            const label = document.createElement('div');
            label.className = 'bar-label';
            label.textContent = tier.name;

            group.appendChild(label);
            group.appendChild(bar);
            this.els.barChart.appendChild(group);
        });
    }

    updateCalculator(targetRarityId, desiredProb) {
        // n = ln(1 - P) / ln(1 - rate)
        // targetRarityId e.g. 'legendary'
        const tier = Object.values(CONFIG.current).find(t => t.id === targetRarityId);
        if (!tier) return;

        const rate = tier.rate;
        const prob = desiredProb / 100; // 0.50 for 50%

        if (prob >= 1) return "Infinity";

        const n = Math.log(1 - prob) / Math.log(1 - rate);
        return Math.ceil(n);
    }
}
