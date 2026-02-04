import { GachaSystem } from './core/GachaSystem.js';
import { Renderer } from './ui/Renderer.js';
import { CONFIG, PRESETS } from './data/Config.js';
import { SoundManager } from './core/SoundManager.js';

const app = {
  init() {
    this.system = new GachaSystem();
    this.renderer = new Renderer();
    this.sound = new SoundManager();
    this.initListeners();

    // Initial setup
    this.renderer.updateStats(this.system);
    this.updateCalc();
  },

  initListeners() {
    const doc = document;

    // Pull Buttons
    doc.getElementById('pull-1').addEventListener('click', () => this.handlePull(1));
    doc.getElementById('pull-10').addEventListener('click', () => this.handlePull(10));

    // Reset
    doc.getElementById('reset-btn').addEventListener('click', () => {
      if (confirm('Reset all stats and history?')) {
        this.system.reset();
        this.renderer.initStatsGrid(); // Clear stats
        this.renderer.updateStats(this.system);
        this.renderer.renderPullResults([]);
      }
    });

    // Fast Mode
    this.fastModeEl = doc.getElementById('speed-toggle');

    // Sound Toggle
    const soundToggle = doc.getElementById('sound-toggle');
    soundToggle.addEventListener('change', (e) => {
      this.sound.toggle(e.target.checked);
    });

    // Preset Selector
    const presetSelect = doc.getElementById('preset-select');
    presetSelect.addEventListener('change', (e) => {
      const val = e.target.value;
      if (PRESETS[val]) {
        CONFIG.current = PRESETS[val];
        // Refresh UI
        this.renderer.initStatsGrid();
        this.renderer.updateStats(this.system);
        this.updateCalc();
      }
    });

    // Calculator Listeners
    doc.getElementById('calc-rarity').addEventListener('change', () => this.updateCalc());
    doc.getElementById('calc-prob').addEventListener('change', () => this.updateCalc());
  },

  updateCalc() {
    const rarity = document.getElementById('calc-rarity').value;
    const prob = parseInt(document.getElementById('calc-prob').value);

    const result = this.renderer.updateCalculator(rarity, prob);
    const display = document.getElementById('calc-result-display');

    if (result) {
      display.textContent = `${result} Pulls`;
      const cost = result * 2;
      display.innerHTML += `<div style='font-size:0.6rem; opacity:0.7'>Cost: ~$${cost}</div>`;
    } else {
      display.textContent = "N/A";
    }
  },

  async handlePull(amount) {
    const isFast = this.fastModeEl.checked;
    const box = document.getElementById('gacha-box');

    // Ensure Audio Context is resumed
    if (this.sound.ctx.state === 'suspended') {
      this.sound.ctx.resume();
    }

    const btns = document.querySelectorAll('.btn:not(.small)');
    btns.forEach(b => b.disabled = true);

    if (!isFast) {
      box.classList.add('anim-shake');
      await new Promise(r => setTimeout(r, 600));
      box.classList.remove('anim-shake');
    }

    const results = this.system.pull(amount);

    const bestItem = results.reduce((prev, curr) => (curr.rate < prev.rate ? curr : prev), results[0]);
    if (bestItem) this.sound.play(bestItem.id);

    this.renderer.renderPullResults(results);
    this.renderer.updateStats(this.system);

    btns.forEach(b => b.disabled = false);
  }
};

app.init();
