/*
 * "Garagem" 3D: showroom com piso quadriculado (igual ao da loja), pistas de F1
 * em neon nas paredes, giro 360° do carro por fora e entrada até o banco do motorista.
 */
import * as THREE from "three";
import { RoomEnvironment } from "../vendor/RoomEnvironment.js";
import { criarCarro } from "./carModel.js";
import { CIRCUITOS, pontosSuaves } from "./circuits.js";
import { som } from "./audio.js";

const suave = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const lerp = (a, b, t) => a + (b - a) * t;
const limitar = (v, a, b) => Math.max(a, Math.min(b, v));
const reduzMovimento = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function webglDisponivel() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch {
    return false;
  }
}

function texturaXadrez(corA, corB, casas, tam = 512, borda = null) {
  const c = document.createElement("canvas");
  c.width = c.height = tam;
  const g = c.getContext("2d");
  const s = tam / casas;
  for (let i = 0; i < casas; i++)
    for (let j = 0; j < casas; j++) {
      g.fillStyle = (i + j) % 2 ? corA : corB;
      g.fillRect(i * s, j * s, s, s);
      if (borda) {
        g.strokeStyle = borda;
        g.lineWidth = 2;
        g.strokeRect(i * s + 1, j * s + 1, s - 2, s - 2);
      }
    }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

function textoPlano(texto, larg, alt, { cor = "#fff", fundo = null, fonte = "bold 64px sans-serif" } = {}) {
  const c = document.createElement("canvas");
  c.width = 1024; c.height = Math.round((1024 * alt) / larg);
  const g = c.getContext("2d");
  if (fundo) { g.fillStyle = fundo; g.fillRect(0, 0, c.width, c.height); }
  g.fillStyle = cor; g.font = fonte; g.textAlign = "center"; g.textBaseline = "middle";
  const larguraTexto = g.measureText(texto).width;
  const caber = Math.min(1, (c.width * 0.9) / larguraTexto);
  g.translate(c.width / 2, c.height / 2);
  g.scale(caber, caber);
  g.fillText(texto, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(
    new THREE.PlaneGeometry(larg, alt),
    new THREE.MeshBasicMaterial({ map: t, transparent: !fundo, toneMapped: false })
  );
}

export class Garagem {
  constructor(container, opts = {}) {
    this.container = container;
    this.opts = opts;
    this.captura = !!opts.captura;
    this.aoMudarModo = opts.aoMudarModo || (() => {});

    const r = (this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: this.captura }));
    r.setPixelRatio(this.captura ? 1 : Math.min(window.devicePixelRatio, 2));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(r.domElement);

    this.cena = new THREE.Scene();
    this.cena.background = new THREE.Color(0x07070a);
    this.cena.fog = new THREE.Fog(0x07070a, 14, 30);
    const pmrem = new THREE.PMREMGenerator(r);
    this.cena.environment = pmrem.fromScene(new RoomEnvironment(r), 0.04).texture;
    pmrem.dispose();

    this.camera = new THREE.PerspectiveCamera(38, 1, 0.05, 80);
    this.mundo = new THREE.Group();
    this.cena.add(this.mundo);
    this._montarShowroom();

    // Estado da câmera
    this.modo = "exterior";
    this.yaw = 0.62; this.pitch = 0.16; this.dist = 6.6;
    this.olharYaw = 0; this.olharPitch = -0.1;
    this.alvo = new THREE.Vector3(0, 0.7, 0);
    this.escala = 1;
    this.fovInterior = 62;
    this.ultimoToque = -1e9;
    this.animacoes = [];
    this.hotspots = {};
    this.ativo = false;
    this._relogio = new THREE.Clock();

    if (this.captura) {
      r.setSize(opts.largura || 800, opts.altura || 500, false);
      this.camera.aspect = (opts.largura || 800) / (opts.altura || 500);
      this.camera.updateProjectionMatrix();
    } else {
      this._eventos();
      this._ro = new ResizeObserver(() => this._redimensionar());
      this._ro.observe(container);
      this._redimensionar();
    }
  }

  // ---------------------------------------------------------------- showroom
  _montarShowroom() {
    const m = this.mundo;

    // Chão brilhante
    const chao = new THREE.Mesh(
      new THREE.CircleGeometry(30, 64),
      new THREE.MeshStandardMaterial({ color: 0x0b0b0f, roughness: 0.32, metalness: 0.4 })
    );
    chao.rotation.x = -Math.PI / 2;
    chao.receiveShadow = true;
    m.add(chao);

    // Piso quadriculado cinza/preto + faixa vermelha (como no showroom da loja)
    const centroTex = texturaXadrez("#2b2d34", "#131419", 8, 512, "#0a0a0c");
    centroTex.repeat.set(3, 3);
    const centro = new THREE.Mesh(
      new THREE.CircleGeometry(3.7, 72),
      new THREE.MeshStandardMaterial({ map: centroTex, roughness: 0.45, metalness: 0.15 })
    );
    centro.rotation.x = -Math.PI / 2;
    centro.position.y = 0.003;
    centro.receiveShadow = true;
    m.add(centro);

    const faixaTex = texturaXadrez("#c4121a", "#1a0a0b", 8, 512, "#0a0a0c");
    faixaTex.repeat.set(3, 3);
    const faixa = new THREE.Mesh(
      new THREE.RingGeometry(3.7, 4.5, 96),
      new THREE.MeshStandardMaterial({ map: faixaTex, roughness: 0.45, metalness: 0.15 })
    );
    faixa.rotation.x = -Math.PI / 2;
    faixa.position.y = 0.004;
    faixa.receiveShadow = true;
    m.add(faixa);

    // Parede circular escura
    const parede = new THREE.Mesh(
      new THREE.CylinderGeometry(15, 15, 10, 72, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x101016, roughness: 0.85, side: THREE.BackSide })
    );
    parede.position.y = 5;
    m.add(parede);

    // Logo UK em neon atrás do carro
    const angLogo = Math.PI + 0.62;
    const logo = new THREE.Group();
    const anel = new THREE.Mesh(
      new THREE.TorusGeometry(1.5, 0.2, 20, 80),
      new THREE.MeshStandardMaterial({ color: 0xe10600, emissive: 0xe10600, emissiveIntensity: 1.3, roughness: 0.3 })
    );
    const barra = textoPlano("UK MULTIMARCAS", 4.6, 0.8, { fundo: "#1f3a93", fonte: "900 120px sans-serif" });
    barra.position.z = 0.25;
    logo.add(anel, barra);
    logo.position.set(Math.cos(angLogo) * 14.6, 3.8, Math.sin(angLogo) * 14.6);
    logo.lookAt(0, 3.8, 0);
    m.add(logo);

    // Pistas de F1 em neon espalhadas pela parede (como nas paredes da loja)
    CIRCUITOS.forEach((c, i) => {
      const ang = angLogo + ((i + 1) * Math.PI * 2) / (CIRCUITOS.length + 1);
      const tam = 3.4;
      const pts = pontosSuaves(c.pontos, 6).map(([x, y]) => new THREE.Vector3(((x - 50) / 100) * tam, ((50 - y) / 100) * tam, 0));
      const curva = new THREE.CatmullRomCurve3(pts, true);
      const tubo = new THREE.Mesh(
        new THREE.TubeGeometry(curva, 400, 0.035, 8, true),
        new THREE.MeshBasicMaterial({ color: i % 2 ? 0xffffff : 0xff2a2a, toneMapped: false })
      );
      const g = new THREE.Group();
      g.add(tubo);
      const nome = textoPlano(c.nome.toUpperCase(), 3, 0.4, { cor: "#c8ccd8", fonte: "700 70px sans-serif" });
      nome.position.y = -2.15;
      g.add(nome);
      g.position.set(Math.cos(ang) * 14.6, 3.6, Math.sin(ang) * 14.6);
      g.lookAt(0, 3.6, 0);
      m.add(g);
    });

    // Linhas de LED no teto
    const led = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
    const anelLed = new THREE.Mesh(new THREE.TorusGeometry(4.2, 0.03, 8, 120), led);
    anelLed.rotation.x = Math.PI / 2;
    anelLed.position.y = 6.2;
    m.add(anelLed);
    for (let i = 0; i < 6; i++) {
      const t = new THREE.Mesh(new THREE.BoxGeometry(7, 0.03, 0.05), led);
      t.position.set(0, 6.4, -6 + i * 2.4);
      t.rotation.y = 0.5;
      m.add(t);
    }

    // Luzes
    this.cena.add(new THREE.HemisphereLight(0xffffff, 0x1a1a24, 0.55));
    const sol = new THREE.DirectionalLight(0xffffff, 2.2);
    sol.position.set(4, 9, 5);
    sol.castShadow = true;
    sol.shadow.mapSize.set(1024, 1024);
    Object.assign(sol.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 25 });
    sol.shadow.bias = -0.0005;
    this.cena.add(sol);
    const vermelha = new THREE.PointLight(0xff2020, 8, 14, 1.6);
    vermelha.position.set(-4.5, 1.6, -3.5);
    const azul = new THREE.PointLight(0x2a4dff, 12, 14, 1.6);
    azul.position.set(4.5, 1.6, -4);
    this.cena.add(vermelha, azul);
  }

  // ---------------------------------------------------------------- carro
  definirCarro(carro) {
    if (this.modelo) {
      this.cena.remove(this.modelo.grupo);
      this.modelo.grupo.traverse((o) => o.geometry && o.geometry.dispose());
    }
    if (this.pano) { this.cena.remove(this.pano); this.pano = null; }
    this.carro = carro;
    this.modelo = criarCarro(carro);
    this.cena.add(this.modelo.grupo);
    this.mundo.visible = true;
    this.modelo.grupo.visible = true;
    this.modo = "exterior";
    this.yaw = 0.62; this.pitch = 0.16; this.dist = 6.6 * (this.modelo.perfil.L / 4.5);
    this.camera.fov = 38;
    this.camera.updateProjectionMatrix();
    this.ultimoToque = -1e9;
    this.alvo.set(0, this.modelo.alvoCentro.y * 0.85, 0);
  }

  definirHotspots(mapa) {
    this.hotspots = mapa;
  }

  // ---------------------------------------------------------------- ciclo
  iniciar() {
    if (this.ativo) return;
    this.ativo = true;
    this._relogio.getDelta();
    const tick = () => {
      if (!this.ativo) return;
      requestAnimationFrame(tick);
      this._quadro(Math.min(this._relogio.getDelta(), 0.12));
    };
    requestAnimationFrame(tick);
  }

  parar() {
    this.ativo = false;
  }

  _quadro(dt) {
    // animações em andamento
    this.animacoes = this.animacoes.filter((a) => {
      a.t += dt / a.dur;
      const e = suave(Math.min(a.t, 1));
      a.fn(e);
      if (a.t >= 1) { a.fim(); return false; }
      return true;
    });

    if (this.modo === "exterior") {
      if (performance.now() - this.ultimoToque > 2500 && !reduzMovimento()) this.yaw += dt * 0.16;
      this._posicionarOrbita();
    } else if (this.modo === "interior") {
      this._posicionarInterior();
    }

    this._atualizarHotspots();
    this.renderer.render(this.cena, this.camera);
  }

  _posicionarOrbita() {
    const d = this.dist * this.escala;
    this.camera.position.set(
      this.alvo.x + d * Math.cos(this.pitch) * Math.cos(this.yaw),
      this.alvo.y + d * Math.sin(this.pitch),
      this.alvo.z + d * Math.cos(this.pitch) * Math.sin(this.yaw)
    );
    this.camera.lookAt(this.alvo);
  }

  _direcaoOlhar() {
    return new THREE.Vector3(
      Math.cos(this.olharPitch) * Math.cos(this.olharYaw),
      Math.sin(this.olharPitch),
      Math.cos(this.olharPitch) * Math.sin(this.olharYaw)
    );
  }

  _posicionarInterior() {
    this.camera.position.copy(this.modelo.olhos);
    this.camera.lookAt(this.modelo.olhos.clone().add(this._direcaoOlhar()));
  }

  _atualizarHotspots() {
    const lista = this.modelo ? this.modelo.ancoras : [];
    const w = this.renderer.domElement.clientWidth, h = this.renderer.domElement.clientHeight;
    const mostrar = this.modo === "exterior";
    lista.forEach((a) => {
      const el = this.hotspots[a.chave];
      if (!el) return;
      const v = a.pos.clone().project(this.camera);
      const paraCamera = this.camera.position.clone().sub(a.pos).normalize();
      const visivel = mostrar && v.z < 1 && paraCamera.dot(a.normal.clone().normalize()) > 0.15;
      el.classList.toggle("oculto", !visivel);
      el.style.transform = `translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px)`;
    });
  }

  animar(dur, fn) {
    if (reduzMovimento()) dur = Math.min(dur, 0.2);
    return new Promise((fim) => this.animacoes.push({ dur, t: 0, fn, fim }));
  }

  // ---------------------------------------------------------------- entrar / sair
  async entrar() {
    if (this.modo !== "exterior" || !this.modelo) return;
    this.modo = "transicao";
    this.aoMudarModo("transicao");
    const { janela, olhos } = this.modelo;

    // 1) gira até o lado do motorista
    const yawAlvo = -Math.PI / 2 + 0.3;
    let dy = ((yawAlvo - this.yaw) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
    const y0 = this.yaw, p0 = this.pitch, d0 = this.dist;
    await this.animar(0.9, (e) => {
      this.yaw = y0 + dy * e;
      this.pitch = lerp(p0, 0.08, e);
      this.dist = lerp(d0, 5.2, e);
      this._posicionarOrbita();
    });

    // 2) aproxima da janela
    const ini = this.camera.position.clone();
    const olharIni = this.alvo.clone();
    await this.animar(1.0, (e) => {
      this.camera.position.lerpVectors(ini, janela, e);
      this.camera.lookAt(new THREE.Vector3().lerpVectors(olharIni, olhos, e));
    });

    // 3) "senta" no banco do motorista
    som.porta();
    this.aoMudarModo("piscar");
    this._vidros(0.16);
    const frente = olhos.clone().add(new THREE.Vector3(3, -0.35, 0));
    const lateral = olhos.clone().add(new THREE.Vector3(0.2, -0.1, 1.2));
    await this.animar(1.1, (e) => {
      this.camera.position.lerpVectors(janela, olhos, e);
      this.camera.lookAt(new THREE.Vector3().lerpVectors(lateral, frente, e));
      this.camera.fov = lerp(38, this.fovInterior, e);
      this.camera.updateProjectionMatrix();
    });

    this.olharYaw = 0;
    this.olharPitch = Math.atan2(-0.35, 3);
    if (this.carro.panorama) this._mostrarPanorama();
    this.modo = "interior";
    this.aoMudarModo("interior");
  }

  async sair() {
    if (this.modo !== "interior") return;
    this.modo = "transicao";
    this.aoMudarModo("transicao");
    this._esconderPanorama();
    const { janela, olhos } = this.modelo;
    const dirIni = olhos.clone().add(this._direcaoOlhar());
    this.aoMudarModo("piscar");
    await this.animar(0.9, (e) => {
      this.camera.position.lerpVectors(olhos, janela, e);
      this.camera.lookAt(new THREE.Vector3().lerpVectors(dirIni, olhos, e));
      this.camera.fov = lerp(this.fovInterior, 38, e);
      this.camera.updateProjectionMatrix();
    });
    this.yaw = -Math.PI / 2 + 0.3; this.pitch = 0.08; this.dist = 5.2;
    const fimPos = new THREE.Vector3();
    const d = this.dist * this.escala;
    fimPos.set(d * Math.cos(this.pitch) * Math.cos(this.yaw), this.alvo.y + d * Math.sin(this.pitch), d * Math.cos(this.pitch) * Math.sin(this.yaw));
    this._vidros(0.8);
    await this.animar(0.9, (e) => {
      this.camera.position.lerpVectors(janela, fimPos, e);
      this.camera.lookAt(new THREE.Vector3().lerpVectors(olhos, this.alvo, e));
    });
    this.dist = 6.6 * (this.modelo.perfil.L / 4.5);
    this.ultimoToque = performance.now();
    this.modo = "exterior";
    this.aoMudarModo("exterior");
  }

  // vidros escuros por fora, claros por dentro (para enxergar o showroom)
  _vidros(opacidade) {
    if (this.modelo) this.modelo.vidro.opacity = opacidade;
  }

  /** Coloca a câmera direto no banco (usado quando o exterior é feito com fotos reais). */
  irParaInterior() {
    this._vidros(0.16);
    this.olharYaw = 0;
    this.olharPitch = Math.atan2(-0.35, 3);
    this.camera.fov = this.fovInterior;
    this.camera.updateProjectionMatrix();
    if (this.carro.panorama) this._mostrarPanorama();
    this.modo = "interior";
  }

  _mostrarPanorama() {
    if (!this.pano) {
      const tex = new THREE.TextureLoader().load(this.carro.panorama);
      tex.colorSpace = THREE.SRGBColorSpace;
      const geo = new THREE.SphereGeometry(10, 64, 32);
      geo.scale(-1, 1, 1);
      this.pano = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex }));
    }
    this.pano.position.copy(this.modelo.olhos);
    this.cena.add(this.pano);
    this.mundo.visible = false;
    this.modelo.grupo.visible = false;
  }

  _esconderPanorama() {
    if (this.pano) this.cena.remove(this.pano);
    this.mundo.visible = true;
    if (this.modelo) this.modelo.grupo.visible = true;
  }

  // ---------------------------------------------------------------- interação
  _eventos() {
    const el = this.renderer.domElement;
    el.style.touchAction = "none";
    const ponteiros = new Map();
    let distPinca = 0;

    el.addEventListener("pointerdown", (e) => {
      el.setPointerCapture(e.pointerId);
      ponteiros.set(e.pointerId, { x: e.clientX, y: e.clientY });
      this.ultimoToque = performance.now();
      el.classList.add("arrastando");
    });
    el.addEventListener("pointermove", (e) => {
      const ant = ponteiros.get(e.pointerId);
      if (!ant) return;
      const dx = e.clientX - ant.x, dy = e.clientY - ant.y;
      ponteiros.set(e.pointerId, { x: e.clientX, y: e.clientY });
      this.ultimoToque = performance.now();
      if (ponteiros.size === 2) {
        const [a, b] = [...ponteiros.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (distPinca) this._zoom((distPinca - d) * 4);
        distPinca = d;
        return;
      }
      if (this.modo === "exterior") {
        this.yaw += dx * 0.007;
        this.pitch = limitar(this.pitch + dy * 0.004, 0.02, 0.8);
      } else if (this.modo === "interior") {
        this.olharYaw = limitar(this.olharYaw + dx * 0.004, -2.6, 2.6);
        this.olharPitch = limitar(this.olharPitch + dy * 0.004, -1.0, 0.8);
      }
    });
    const soltar = (e) => {
      ponteiros.delete(e.pointerId);
      if (ponteiros.size < 2) distPinca = 0;
      if (!ponteiros.size) el.classList.remove("arrastando");
    };
    el.addEventListener("pointerup", soltar);
    el.addEventListener("pointercancel", soltar);
    el.addEventListener("wheel", (e) => { e.preventDefault(); this._zoom(e.deltaY); }, { passive: false });
  }

  _zoom(delta) {
    this.ultimoToque = performance.now();
    if (this.modo === "exterior") {
      const base = 6.6 * (this.modelo ? this.modelo.perfil.L / 4.5 : 1);
      this.dist = limitar(this.dist * (1 + delta * 0.001), base * 0.6, base * 1.4);
    } else if (this.modo === "interior") {
      this.camera.fov = limitar(this.camera.fov + delta * 0.03, 40, 95);
      this.camera.updateProjectionMatrix();
    }
  }

  _redimensionar() {
    const w = this.container.clientWidth || 1, h = this.container.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.escala = Math.max(1, 1.1 / Math.pow(w / h, 0.9));
    this.fovInterior = w / h < 1 ? 82 : 62;
    if (this.modo === "interior") this.camera.fov = this.fovInterior;
    this.camera.updateProjectionMatrix();
  }

  // ---------------------------------------------------------------- capas dos cards
  fotografar(carro) {
    this.definirCarro(carro);
    this.yaw = 0.68; this.pitch = 0.12;
    this.dist = 6.0 * (this.modelo.perfil.L / 4.5);
    this._posicionarOrbita();
    this.renderer.render(this.cena, this.camera);
    return this.renderer.domElement.toDataURL("image/jpeg", 0.86);
  }

  destruir() {
    this.parar();
    this._ro && this._ro.disconnect();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}

/** Gera as imagens provisórias dos cards a partir do modelo 3D. */
export function gerarCapas(carros, largura = 800, altura = 500) {
  const div = document.createElement("div");
  const g = new Garagem(div, { captura: true, largura, altura });
  const capas = {};
  carros.forEach((c) => (capas[c.id] = g.fotografar(c)));
  g.destruir();
  return capas;
}
