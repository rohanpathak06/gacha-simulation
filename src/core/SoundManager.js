export class SoundManager {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.enabled = true;
    }

    toggle(state) {
        this.enabled = state;
        if (this.enabled && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    play(rarityId) {
        if (!this.enabled) return;

        switch (rarityId) {
            case 'common':
                this.beep(200, 0.1, 'triangle');
                break;
            case 'uncommon':
                this.beep(300, 0.1, 'sine');
                break;
            case 'rare':
                this.strum([300, 400, 500]);
                break;
            case 'epic':
                this.strum([400, 600, 800, 1000]);
                break;
            case 'legendary':
            case 'mythic':
                this.fanfare();
                break;
        }
    }

    beep(freq, duration, type = 'sine') {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    strum(freqs) {
        freqs.forEach((f, i) => {
            setTimeout(() => this.beep(f, 0.3, 'sine'), i * 50);
        });
    }

    fanfare() {
        const now = this.ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C Major arpeggio
        notes.forEach((f, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.frequency.value = f;
            osc.type = 'square';
            gain.gain.value = 0.1;
            gain.gain.exponentialRampToValueAtTime(0.01, now + (i * 0.1) + 0.5);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now + i * 0.1);
            osc.stop(now + i * 0.1 + 0.6);
        });
    }
}
