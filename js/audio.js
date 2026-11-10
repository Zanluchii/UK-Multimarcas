/* Sons sintetizados (sem arquivos): porta, partida e ronco do motor. Desligado por padrão. */
let ctx = null;
let ligado = false;
let motor = null;

const garantirCtx = () => {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
};

export const som = {
  get ligado() { return ligado; },
  alternar() {
    ligado = !ligado;
    if (ligado) garantirCtx();
    else this.desligarMotor();
    return ligado;
  },

  porta() {
    if (!ligado) return;
    const c = garantirCtx();
    const dur = 0.35;
    const buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 4);
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = "lowpass"; f.frequency.value = 260;
    const g = c.createGain();
    g.gain.value = 1.4;
    src.connect(f).connect(g).connect(c.destination);
    src.start();
  },

  partida() {
    if (!ligado) return;
    const c = garantirCtx();
    this.desligarMotor();
    const t = c.currentTime;
    const osc = c.createOscillator();
    const osc2 = c.createOscillator();
    osc.type = "sawtooth"; osc2.type = "square";
    const filtro = c.createBiquadFilter();
    filtro.type = "lowpass"; filtro.frequency.value = 900; filtro.Q.value = 6;
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.18, t + 0.15);
    // giro: partida -> acelerada -> marcha lenta
    [osc, osc2].forEach((o, i) => {
      const m = i ? 0.5 : 1;
      o.frequency.setValueAtTime(28 * m, t);
      o.frequency.linearRampToValueAtTime(55 * m, t + 0.4);
      o.frequency.exponentialRampToValueAtTime(190 * m, t + 1.1);
      o.frequency.exponentialRampToValueAtTime(42 * m, t + 2.2);
      o.connect(filtro);
    });
    filtro.connect(g).connect(c.destination);
    osc.start(); osc2.start();
    motor = { osc, osc2, g };
  },

  desligarMotor() {
    if (!motor || !ctx) return;
    const { osc, osc2, g } = motor;
    const t = ctx.currentTime;
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(g.gain.value, t);
    g.gain.linearRampToValueAtTime(0, t + 0.4);
    osc.stop(t + 0.45); osc2.stop(t + 0.45);
    motor = null;
  },
};
