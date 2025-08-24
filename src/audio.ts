// WebAudio：確実に resume/unlock し、和音を鳴らす
class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private unlocked = false;

  private ensureCreated() {
    if (this.ctx) return;
    const Ctx: any = (window as any).AudioContext || (window as any).webkitAudioContext;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(this.ctx.destination);
  }

  async ensure() {
    this.ensureCreated();
    if (this.ctx!.state === "suspended") {
      try { await this.ctx!.resume(); } catch {}
    }
  }

  unlock() {
    if (this.unlocked) return;
    const h = async () => { await this.ensure(); this.unlocked = true; };
    window.addEventListener("pointerdown", h, { once:true });
    window.addEventListener("keydown", h, { once:true });
    window.addEventListener("touchstart", h, { once:true, passive:true });
  }

  async stop() {
    if (!this.ctx) return;
    try { await this.ctx.suspend(); } catch {}
  }

  /** 和音再生：freqs[0]をベース、それ以降を上もの */
  async playChord(freqs: number[], durSec: number) {
    await this.ensure();
    const ctx = this.ctx!, now = ctx.currentTime;

    const mk = (gain:number) => {
      const g = ctx.createGain();
      g.connect(this.master!);
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(gain, now + 0.03);
      g.gain.setTargetAtTime(0, now + durSec * 0.9, 0.08);
      return g;
    };

    const bassG = mk(0.3);
    const upG   = mk(0.22);

    const osc = (f:number, g:GainNode) => {
      const o = ctx.createOscillator();
      o.type = "square";
      o.frequency.value = Math.min(23999, Math.max(40, f));
      o.connect(g);
      o.start(now);
      o.stop(now + durSec + 0.1);
    };

    if (freqs.length) osc(freqs[0], bassG);
    freqs.slice(1).forEach(f => osc(f, upG));
  }
}
export const audio = new AudioEngine();
audio.unlock();
