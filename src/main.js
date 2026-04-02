import { GachaSystem } from './core/GachaSystem.js';
import { Renderer } from './ui/Renderer.js';
import { CONFIG, PRESETS, PITY_CONFIG } from './data/Config.js';
import { SoundManager } from './core/SoundManager.js';

/**
 * Main application orchestrator for the Gacha Simulator.
 * Wires the UI Renderer to the underlying state logic and manages global events.
 */
const app = {
  /**
   * Bootstraps the application, loads persistent state, and attaches DOM listeners.
   */
  init() {
    this.system = new GachaSystem();
    this.renderer = new Renderer();
    this.sound = new SoundManager();
    this.isPulling = false;

    this.initListeners();
    this.syncUI();
    this.checkOnboarding();
  },

  initListeners() {
    // Manual
    document.getElementById('manual-btn').addEventListener('click', () => {
      document.getElementById('onboarding-overlay').classList.remove('hidden');
    });

    // Pull Buttons
    document.getElementById('pull-1').addEventListener('click', () => this.handlePull(1));
    document.getElementById('pull-10').addEventListener('click', () => this.handlePull(10));

    // Reset
    document.getElementById('reset-btn').addEventListener('click', () => {
      if (confirm('Reset all stats and history?')) {
        this.system.reset();
        this.renderer.resetCapsule();
        this.renderer.clearLastPull();
        this.renderer.clearMultiOverlay();
        this.syncUI();
      }
    });

    // Settings (placeholder — could toggle sound/speed)
    document.getElementById('settings-btn').addEventListener('click', () => {
      // Toggle sound
      this.sound.toggle(!this.sound.enabled);
      const btn = document.getElementById('settings-btn');
      btn.textContent = this.sound.enabled ? 'Sound On' : 'Sound Off';
    });

    // History show all
    document.getElementById('history-show-all').addEventListener('click', () => {
      this.renderer.toggleHistoryExpanded(this.system.history);
    });
  },

  /**
   * Refreshes all UI sub-components to mirror the current application state.
   */
  syncUI() {
    this.renderer.updateStats(this.system);
    this.renderer.renderHistory(this.system.history);

    // Restore last pull
    if (this.system.history.length > 0) {
      const lastItem = this.system.history[this.system.history.length - 1];
      this.renderer.updateLastPull(lastItem);
    } else {
      this.renderer.clearLastPull();
    }
  },

  /**
   * Manages the initial user manual logic and manual re-triggering.
   */
  checkOnboarding() {
    const overlay = document.getElementById('onboarding-overlay');
    const dismissBtn = document.getElementById('onboarding-dismiss');
    
    // Always attach the dismiss listener so it works when opened manually
    dismissBtn.addEventListener('click', () => {
      overlay.classList.add('hidden');
      localStorage.setItem('gacha_onboarding_seen', '1');
    });

    const seen = localStorage.getItem('gacha_onboarding_seen');

    // Only show it if they have never seen it AND haven't started pulling
    if (!seen && this.system.pullCount === 0) {
      overlay.classList.remove('hidden');
    }
  },

  setButtons(disabled) {
    document.getElementById('pull-1').disabled = disabled;
    document.getElementById('pull-10').disabled = disabled;
  },


  /**
   * Main interaction handler for triggering pulls. Resolves animations and state.
   * @param {number} amount Number of items to pull (1 or 10).
   * @returns {Promise<void>}
   */
  async handlePull(amount) {
    if (this.isPulling) return;
    this.isPulling = true;
    this.setButtons(true);

    // Resume audio context if needed
    if (this.sound.ctx && this.sound.ctx.state === 'suspended') {
      this.sound.ctx.resume();
    }

    // Clear previous multi-overlay
    this.renderer.clearMultiOverlay();
    this.renderer.resetCapsule();

    // Perform the pull
    const results = this.system.pull(amount);

    // Store pity-at-pull for each result (retroactively — we need to compute this)
    // The pity counter was updated during pull, so we back-calculate
    this.enrichResultsWithPity(results);

    // Play sound for the best item
    const bestItem = results.reduce((prev, curr) => (curr.rate < prev.rate ? curr : prev), results[0]);
    if (bestItem) this.sound.play(bestItem.id);

    if (amount === 1) {
      await this.renderer.animateSinglePull(results[0]);
    } else {
      await this.renderer.animateMultiPull(results);
    }

    // Update last pull with the best item of the batch
    this.renderer.updateLastPull(bestItem);

    // Update all stats and history
    this.renderer.updateStats(this.system);
    this.renderer.renderHistory(this.system.history);

    this.isPulling = false;
    this.setButtons(false);
  },

  /**
   * Enrich pull results with the pity counter at the time of that pull.
   * Since the gacha system doesn't track per-pull pity, we approximate.
   */
  enrichResultsWithPity(results) {
    // We'll walk backwards through the history to assign pity values
    // For simplicity, just note the current pity state after the batch
    const currentPity = this.system.pityCounter.legendary;
    results.forEach((r, i) => {
      // Rough: the last result in the batch reflects the current pity,
      // earlier ones had incrementally lower values (if no 5★ reset happened)
      r.pityAtPull = Math.max(0, currentPity - (results.length - 1 - i));
    });
  }
};

app.init();
