export class AudioEngine {
  ctx: AudioContext | null = null; gain!: GainNode
  async unlock(){ if (!this.ctx){ this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)(); this.gain = this.ctx.createGain(); this.gain.gain.value = 0.85; this.gain.connect(this.ctx.destination) } await this.ctx!.resume() }
  now(){ return this.ctx?.currentTime ?? 0 }
  playTone(freq:number, start:number, dur:number, type: OscillatorType = 'square', vol=0.7){
    if (!this.ctx) return
    const osc = this.ctx.createOscillator(); const g = this.ctx.createGain()
    osc.frequency.value = freq; osc.type = type
    g.gain.setValueAtTime(0, start)
    const A = 0.005, D = 0.02, S = 0.65*vol, R = 0.08
    g.gain.linearRampToValueAtTime(vol, start + A)
    g.gain.linearRampToValueAtTime(S, start + A + D)
    g.gain.setValueAtTime(S, Math.max(start + dur - R, start + A + D + 0.005))
    g.gain.linearRampToValueAtTime(0.0001, start + dur)
    osc.connect(g).connect(this.gain); osc.start(start); osc.stop(start + dur + 0.01)
  }
  stopAll(){ if (!this.ctx) return; try{ this.gain.disconnect(); }catch{}; try{ this.ctx.close(); }catch{}; this.ctx = null as any }
  midiToHz(n:number){ return 440 * Math.pow(2, (n-69)/12) }
  playChord(bass:number, chord:number[], when:number, dur:number){
    const bvol = 0.7, cvol = 0.45
    this.playTone(this.midiToHz(bass), when, dur, 'square', bvol)
    chord.forEach(n => this.playTone(this.midiToHz(n), when, dur*0.995, 'square', cvol))
  }
}
