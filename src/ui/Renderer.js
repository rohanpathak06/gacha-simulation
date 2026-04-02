import { CONFIG, PITY_CONFIG } from '../data/Config.js';

/**
 * Maps tier IDs to a star rarity for display.
 * 5★ = legendary, mythic
 * 4★ = epic, rare
 * 3★ = uncommon, common
 */
function getStarRarity(id) {
  if (id === 'legendary' || id === 'mythic') return 5;
  if (id === 'epic' || id === 'rare') return 4;
  return 3;
}

function getStarString(stars) {
  return '★'.repeat(stars);
}

function formatTime(timestamp) {
  const d = new Date(timestamp);
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  const s = d.getSeconds().toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function getRarityDataAttr(id) {
  const stars = getStarRarity(id);
  if (stars >= 5) return '5';
  if (stars >= 4) return '4';
  if (stars >= 3) return '3';
  return 'low';
}

/**
 * Handles all DOM manipulation, CSS animation triggering, and UI state synchronization.
 * Serves as the sole bridge between the GachaSystem logic and the browser document.
 */
export class Renderer {
  /**
   * Initializes DOM element references and display config.
   */
  constructor() {
    this.els = {
      // Stats
      totalPulls: document.getElementById('total-pulls-num'),
      pityCountNum: document.getElementById('pity-count-num'),
      fiveStarNum: document.getElementById('five-star-num'),
      fourStarNum: document.getElementById('four-star-num'),
      statPityCard: document.getElementById('stat-pity-count'),

      // Pity tracker
      pityNumber: document.getElementById('pity-number'),
      pityBarFill: document.getElementById('pity-bar-fill'),
      pityGuaranteed: document.getElementById('pity-guaranteed'),

      // Last pull
      lastPullCard: document.getElementById('last-pull-card'),
      lastPullBody: document.getElementById('last-pull-body'),

      // Machine
      capsule: document.getElementById('capsule'),
      machineBody: document.querySelector('.card-body'),

      // History
      historyTable: document.getElementById('history-table'),
      historyEmpty: document.getElementById('history-empty'),
      historyShowAll: document.getElementById('history-show-all'),
    };

    this.historyExpanded = false;
    this.VISIBLE_ROWS = 8;
  }

  // ─── Stats Cards ───────────────────────────────────

  /**
   * Updates all bento grid statistical cards including pity and general counts.
   * @param {Object} system The active GachaSystem instance
   */
  updateStats(system) {
    const total = system.pullCount;
    const pity = system.pityCounter.legendary;

    this.els.totalPulls.textContent = total;
    this.els.pityCountNum.textContent = pity;

    // Count 5★ and 4★
    let fiveCount = 0;
    let fourCount = 0;
    system.history.forEach(item => {
      const stars = getStarRating(item.id);
      if (stars === 5) fiveCount++;
      else if (stars === 4) fourCount++;
    });

    this.els.fiveStarNum.textContent = fiveCount;
    this.els.fourStarNum.textContent = fourCount;

    // Pity stat card border
    const pityCard = this.els.statPityCard;
    if (pity > 60) {
      pityCard.classList.remove('pity-normal');
      pityCard.classList.add('pity-alert');
    } else {
      pityCard.classList.remove('pity-alert');
      pityCard.classList.add('pity-normal');
    }

    // Pity tracker card
    this.updatePityTracker(pity);
  }

  updatePityTracker(pity) {
    const maxPity = PITY_CONFIG.GUARANTEED_LEGENDARY_AT;
    this.els.pityNumber.textContent = pity;

    const pct = Math.min((pity / maxPity) * 100, 100);
    this.els.pityBarFill.style.width = `${pct}%`;

    if (pity > 60) {
      this.els.pityBarFill.classList.add('high-pity');
    } else {
      this.els.pityBarFill.classList.remove('high-pity');
    }

    // Guaranteed pill
    if (pity >= maxPity - 1) {
      this.els.pityGuaranteed.classList.remove('hidden');
    } else {
      this.els.pityGuaranteed.classList.add('hidden');
    }
  }

  // ─── Last Pull Card ────────────────────────────────

  updateLastPull(item) {
    if (!item) return;

    const stars = getStarRating(item.id);
    const rarityAttr = getRarityDataAttr(item.id);

    this.els.lastPullCard.setAttribute('data-rarity', rarityAttr);
    this.els.lastPullBody.innerHTML = `
      <div class="last-pull-name">${item.name} Item</div>
      <div class="last-pull-stars" data-rarity="${rarityAttr}">${getStarString(stars)}</div>
    `;
  }

  clearLastPull() {
    this.els.lastPullCard.removeAttribute('data-rarity');
    this.els.lastPullBody.innerHTML = `
      <div class="last-pull-empty">
        <span class="em-dash">—</span>
        No pulls yet
      </div>
    `;
  }

  // ─── Machine Capsule Animation ─────────────────────

  /**
   * Plays the bespoke CSS spring animation for a single pull.
   * Forces a DOM reflow to restart CSS keyframes reliably.
   * @param {Object} item The item object dictating rarity color.
   * @returns {Promise<void>} Resolves when the primary reveal animation concludes.
   */
  async animateSinglePull(item) {
    const capsule = this.els.capsule;
    const rarityAttr = getRarityDataAttr(item.id);

    // Reset capsule
    capsule.className = 'capsule';
    capsule.removeAttribute('data-rarity');

    // Force reflow
    void capsule.offsetWidth;

    // Set rarity and trigger reveal
    capsule.setAttribute('data-rarity', rarityAttr);
    capsule.classList.add('revealing', 'flash-rarity');

    // Wait for animation
    await new Promise(r => setTimeout(r, 600));

    capsule.classList.remove('revealing');
    capsule.classList.add('revealed');

    // After 1.5s, return capsule to grayscale
    setTimeout(() => {
      capsule.classList.remove('flash-rarity');
      capsule.classList.add('flash-done');
    }, 1500);
  }

  /**
   * Orchestrates the staggered appearance of 10 pull result stars.
   * @param {Array<Object>} results The array of 10 item objects.
   * @returns {Promise<HTMLElement>} The overlay DOM element to be cleaned up later.
   */
  async animateMultiPull(results) {
    const body = this.els.capsule.closest('.card-body');

    // Create multi-results overlay
    const overlay = document.createElement('div');
    overlay.className = 'multi-results';

    results.forEach((item, i) => {
      const stars = getStarRating(item.id);
      const rarityAttr = getRarityDataAttr(item.id);
      const el = document.createElement('div');
      el.className = 'multi-result-item';
      el.setAttribute('data-rarity', rarityAttr);
      el.textContent = getStarString(stars);
      el.style.animationDelay = `${i * 60}ms`;
      overlay.appendChild(el);
    });

    body.appendChild(overlay);

    // Stagger show
    const items = overlay.querySelectorAll('.multi-result-item');
    items.forEach((el, i) => {
      setTimeout(() => el.classList.add('show'), i * 60);
    });

    // Wait for stagger to complete + linger
    await new Promise(r => setTimeout(r, results.length * 60 + 800));

    // Clean up after view
    return overlay;
  }

  clearMultiOverlay() {
    const body = this.els.capsule.closest('.card-body');
    const overlay = body.querySelector('.multi-results');
    if (overlay) overlay.remove();
  }

  resetCapsule() {
    const capsule = this.els.capsule;
    capsule.className = 'capsule';
    capsule.removeAttribute('data-rarity');
  }

  // ─── History Table ─────────────────────────────────

  /**
   * Re-renders the history data grid. Handles the "Empty state" fallback.
   * @param {Array<Object>} history Full array of previous pulls.
   */
  renderHistory(history) {
    // Remove all rows except header and empty state
    const rows = this.els.historyTable.querySelectorAll('.history-row:not(.history-row--header)');
    rows.forEach(r => r.remove());

    if (history.length === 0) {
      this.els.historyEmpty.style.display = 'flex';
      this.els.historyShowAll.classList.add('hidden');
      return;
    }

    this.els.historyEmpty.style.display = 'none';

    // Show most recent first
    const reversed = [...history].reverse();
    const limit = this.historyExpanded ? reversed.length : Math.min(this.VISIBLE_ROWS, reversed.length);

    for (let i = 0; i < limit; i++) {
      const item = reversed[i];
      this.appendHistoryRow(item);
    }

    // Show all button
    if (history.length > this.VISIBLE_ROWS && !this.historyExpanded) {
      this.els.historyShowAll.textContent = `Show all (${history.length})`;
      this.els.historyShowAll.classList.remove('hidden');
    } else {
      this.els.historyShowAll.classList.add('hidden');
    }
  }

  appendHistoryRow(item) {
    const stars = getStarRating(item.id);
    const rarityAttr = getRarityDataAttr(item.id);
    const starLabel = `${stars}★`;

    const row = document.createElement('div');
    row.className = 'history-row';
    row.innerHTML = `
      <span class="history-cell">${item.pullIndex}</span>
      <span class="history-cell">${item.name} Item</span>
      <span class="history-cell"><span class="rarity-pill" data-rarity="${rarityAttr}">${starLabel}</span></span>
      <span class="history-cell">${item.pityAtPull ?? '—'}</span>
      <span class="history-cell">${formatTime(item.timestamp)}</span>
    `;

    this.els.historyTable.appendChild(row);
  }

  toggleHistoryExpanded(history) {
    this.historyExpanded = !this.historyExpanded;
    this.renderHistory(history);
  }
}

// ── Helper: wraps getStarRarity for export use ──
function getStarRating(id) {
  return getStarRarity(id);
}
