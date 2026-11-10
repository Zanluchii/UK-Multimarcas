import { LOJA, CARROS, brl, kmFmt, whatsappUrl } from "./cars.js";
import { CIRCUITOS, caminhoSVG } from "./circuits.js";
import { som } from "./audio.js";

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const reduzMovimento = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const nomeCarro = (c) => `${c.marca} ${c.modelo}${c.ano ? " " + c.ano : ""}`;

/* ============================================================
   Contatos da loja
   ============================================================ */
$$("[data-campo]").forEach((el) => (el.textContent = LOJA[el.dataset.campo] || ""));
$$("[data-tel]").forEach((a) => (a.href = `tel:${LOJA.telefoneLink}`));
$$("[data-mapa]").forEach((a) => (a.href = LOJA.mapa));
$$("[data-whats]").forEach((a) => {
  a.href = whatsappUrl(a.dataset.whats);
  a.target = "_blank";
  a.rel = "noopener";
});
$$("[data-link]").forEach((a) => (a.href = LOJA[a.dataset.link]));
$("#ano").textContent = new Date().getFullYear();

// Menu mobile
const menu = $(".menu");
$(".menu-toggle").addEventListener("click", (e) => {
  const aberto = menu.classList.toggle("aberto");
  e.currentTarget.setAttribute("aria-expanded", aberto);
});
$$(".menu ul a").forEach((a) => a.addEventListener("click", () => menu.classList.remove("aberto")));

/* ============================================================
   Largada (hero): pistas desenhando + 5 luzes vermelhas
   ============================================================ */
const svgPistas = $(".hero-pistas");
const posHero = [
  [60, 60, 230], [1310, 50, 230], [150, 400, 210], [1210, 400, 220], [-60, 210, 150],
];
svgPistas.innerHTML = CIRCUITOS.map((c, i) => {
  const [x, y, s] = posHero[i % posHero.length];
  return `<g transform="translate(${x} ${y}) scale(${s / 100})">
      <path d="${caminhoSVG(c.pontos)}" pathLength="1" vector-effect="non-scaling-stroke" class="${i % 2 ? "branco" : ""}" style="animation-delay:${i * 0.35}s"/>
    </g>`;
}).join("");

const hero = $(".hero");
async function largada() {
  const luzes = $$(".luz");
  hero.classList.remove("largou");
  luzes.forEach((l) => l.classList.remove("acesa"));
  if (reduzMovimento()) { hero.classList.add("largou"); return; }
  await esperar(500);
  for (const l of luzes) {
    l.classList.add("acesa");
    await esperar(650);
  }
  await esperar(500 + Math.random() * 700); // como na F1: o tempo até apagar varia
  luzes.forEach((l) => l.classList.remove("acesa"));
  void hero.offsetWidth;
  hero.classList.add("largou");
}
$(".semaforo").addEventListener("click", largada);
largada();

/* ============================================================
   Marcas + busca + grid de carros
   ============================================================ */
let filtroMarca = null;
let filtroTexto = "";
const marcas = [...new Set(CARROS.map((c) => c.marca))].sort();
const listaMarcas = $("#marcas");
listaMarcas.innerHTML =
  `<button class="chip-marca ativo" data-marca="">Todas<small>${CARROS.length} carros</small></button>` +
  marcas
    .map((m) => {
      const n = CARROS.filter((c) => c.marca === m).length;
      return `<button class="chip-marca" data-marca="${m}">${m}<small>${n} ${n > 1 ? "carros" : "carro"}</small></button>`;
    })
    .join("");
listaMarcas.addEventListener("click", (e) => {
  const b = e.target.closest(".chip-marca");
  if (!b) return;
  filtroMarca = b.dataset.marca || null;
  $$(".chip-marca").forEach((x) => x.classList.toggle("ativo", x === b));
  renderizarGrid();
  $("#estoque").scrollIntoView({ behavior: reduzMovimento() ? "auto" : "smooth" });
});

$(".busca").addEventListener("submit", (e) => {
  e.preventDefault();
  $("#estoque").scrollIntoView({ behavior: reduzMovimento() ? "auto" : "smooth" });
});
$("#busca").addEventListener("input", (e) => {
  filtroTexto = e.target.value.trim().toLowerCase();
  renderizarGrid();
});
$("#limpar").addEventListener("click", () => {
  filtroMarca = null; filtroTexto = ""; $("#busca").value = "";
  $$(".chip-marca").forEach((x, i) => x.classList.toggle("ativo", i === 0));
  renderizarGrid();
});

const capas = {}; // id -> imagem (foto real ou render 3D provisório)
const capaDe = (c) => (c.fotos && c.fotos[0]) || capas[c.id] || "";

const obsCards = new IntersectionObserver(
  (entradas) => entradas.forEach((en) => {
    if (en.isIntersecting) { en.target.classList.add("visivel"); obsCards.unobserve(en.target); }
  }),
  { threshold: 0.12 }
);

function renderizarGrid() {
  const lista = CARROS.filter(
    (c) =>
      (!filtroMarca || c.marca === filtroMarca) &&
      (!filtroTexto || `${c.marca} ${c.modelo}`.toLowerCase().includes(filtroTexto))
  );
  const grid = $("#grid");
  $("#vazio").hidden = lista.length > 0;
  grid.innerHTML = lista
    .map((c, i) => {
      const capa = capaDe(c);
      const real = c.fotos && c.fotos.length;
      return `<article class="card" tabindex="0" role="button" data-id="${c.id}" aria-label="Ver ${nomeCarro(c)} em 360°" style="animation-delay:${(i % 3) * 0.08}s">
        <div class="card-foto ${capa ? "" : "carregando"}">
          ${capa ? `<img src="${capa}" alt="${nomeCarro(c)}" loading="lazy">` : ""}
          <span class="pos">P${i + 1}</span>
          <span class="selo-360">360° · Entre no carro</span>
          ${real ? "" : `<span class="selo-provisorio">Imagem ilustrativa</span>`}
        </div>
        <div class="card-info">
          <div class="card-marca">${c.marca}</div>
          <h3>${c.modelo}</h3>
          <p class="preco">${brl(c.preco)}</p>
        </div>
        <div class="card-barra"><span>${c.ano || c.marca}</span><span>${kmFmt(c.km)}</span><span class="entrar">Entrar ›</span></div>
      </article>`;
    })
    .join("");
  $$(".card", grid).forEach((card) => {
    obsCards.observe(card);
    ligarCard(card);
  });
}

function ligarCard(card) {
  // leve inclinação 3D acompanhando o mouse
  card.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse" || reduzMovimento()) return;
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    card.style.transform = `perspective(900px) rotateY(${x * 7}deg) rotateX(${-y * 7}deg) translateY(-6px)`;
  });
  card.addEventListener("pointerleave", () => (card.style.transform = ""));
  const abrir = () => abrirComVoo(card);
  card.addEventListener("click", abrir);
  card.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); abrir(); }
  });
}

renderizarGrid();

/* ============================================================
   Circuitos F1
   ============================================================ */
$("#circuitos").innerHTML = CIRCUITOS.map((c) => {
  const d = caminhoSVG(c.pontos);
  return `<article class="circuito">
    <svg viewBox="-5 -5 110 110" aria-hidden="true">
      <path class="brilho" d="${d}"/>
      <path class="pista" d="${d}" pathLength="1"/>
      <circle r="2.6"><animateMotion dur="${6 + c.pontos.length * 0.15}s" repeatCount="indefinite" path="${d}"/></circle>
    </svg>
    <h3>${c.bandeira} ${c.nome}</h3>
    <p>${c.pais} · ${c.extensao}</p>
  </article>`;
}).join("");
const obsCircuitos = new IntersectionObserver(
  (en) => en.forEach((e) => e.isIntersecting && e.target.classList.add("visivel")),
  { threshold: 0.3 }
);
$$(".circuito").forEach((c) => obsCircuitos.observe(c));

// Destaca o item do menu da seção visível
const secoes = $$("main section[id]");
const obsMenu = new IntersectionObserver(
  (en) => en.forEach((e) => {
    if (!e.isIntersecting) return;
    $$(".menu ul a").forEach((a) => a.classList.toggle("ativo", a.getAttribute("href") === `#${e.target.id}`));
  }),
  { rootMargin: "-45% 0px -50% 0px" }
);
secoes.forEach((s) => obsMenu.observe(s));

/* ============================================================
   Capas provisórias (render do modelo 3D)
   ============================================================ */
let modulo3d = null;
const carregar3d = () => (modulo3d ??= import("./garagem3d.js"));

function silhueta(c) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500"><defs><radialGradient id="g" cx="50%" cy="40%"><stop offset="0" stop-color="#2a2c34"/><stop offset="1" stop-color="#0b0b0e"/></radialGradient></defs><rect width="800" height="500" fill="url(#g)"/><path d="M120 330 Q140 260 250 240 L330 180 Q400 160 500 180 L590 240 Q680 250 690 330 Z" fill="${c.corHex}"/><circle cx="240" cy="335" r="42" fill="#111"/><circle cx="570" cy="335" r="42" fill="#111"/><text x="400" y="440" fill="#fff" font-family="sans-serif" font-size="34" font-weight="700" text-anchor="middle">${c.marca} ${c.modelo}</text></svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

async function gerarCapasProvisorias() {
  const semFoto = CARROS.filter((c) => !(c.fotos && c.fotos.length));
  if (!semFoto.length) return;
  try {
    const m = await carregar3d();
    if (!m.webglDisponivel()) throw new Error("sem WebGL");
    await esperar(50);
    Object.assign(capas, m.gerarCapas(semFoto, 800, 500));
  } catch (e) {
    console.warn("Capas 3D indisponíveis:", e);
    semFoto.forEach((c) => (capas[c.id] = silhueta(c)));
  }
  renderizarGrid();
  $$(".card").forEach((c) => c.classList.add("visivel"));
}
gerarCapasProvisorias();

/* ============================================================
   GARAGEM: abrir o carro, girar 360°, entrar
   ============================================================ */
const elG = $("#garagem");
const palco = $("#g-palco");
const camadaHotspots = $("#g-hotspots");
let garagem = null;
let carroAtual = null;
let abertoPorClique = false;
let fotos360 = null;

async function abrirComVoo(card) {
  const id = card.dataset.id;
  const foto = $(".card-foto", card);
  const r = foto.getBoundingClientRect();
  const capa = capaDe(CARROS.find((c) => c.id === id));
  if (!reduzMovimento() && capa) {
    const voo = document.createElement("div");
    voo.className = "voo";
    voo.style.backgroundImage = `url("${capa}")`;
    Object.assign(voo.style, { left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px" });
    document.body.appendChild(voo);
    await voo.animate(
      [
        { left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px", borderRadius: "10px", filter: "brightness(1)" },
        { left: "0px", top: "0px", width: innerWidth + "px", height: innerHeight + "px", borderRadius: "0px", filter: "brightness(.35)" },
      ],
      { duration: 520, easing: "cubic-bezier(.6,0,.2,1)", fill: "forwards" }
    ).finished;
    abertoPorClique = true;
    location.hash = `carro/${id}`;
    await esperar(250);
    voo.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: "forwards" }).finished.then(() => voo.remove());
  } else {
    abertoPorClique = true;
    location.hash = `carro/${id}`;
  }
}

function preencherInfo(c) {
  $("#g-marca").textContent = c.marca;
  $("#g-titulo").textContent = `${c.modelo}${c.ano ? " · " + c.ano : ""}`;
  $("#g-preco").textContent = brl(c.preco);
  const linhas = [
    ["Ano", c.ano], ["Km", c.km != null ? kmFmt(c.km) : null], ["Combustível", c.combustivel], ["Cor", c.cor],
  ].filter(([, v]) => v != null);
  const ilustrativo = !(c.giro360 && c.giro360.length);
  $("#g-ficha").innerHTML = `<h3>Ficha rápida</h3>
    <dl>${linhas.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("")}</dl>
    ${c.opcionais.length ? `<ul>${c.opcionais.map((o) => `<li>${o}</li>`).join("")}</ul>` : ""}
    ${ilustrativo ? `<p class="aviso">Modelo 3D ilustrativo na cor do veículo. Venha conferir o carro de verdade na loja.</p>` : ""}`;
  const msg = `Olá! Vi o ${nomeCarro(c)} (${brl(c.preco)}) no site e quero agendar uma visita para ver de perto.`;
  $$("[data-visita]").forEach((a) => (a.href = whatsappUrl(msg)));
}

function criarHotspots(c) {
  const conteudo = {
    frente: { t: nomeCarro(c), d: [c.combustivel, c.cor].filter(Boolean).join(" · ") || "Venha ver de perto na loja" },
    roda: { t: "Quilometragem", d: c.km != null ? kmFmt(c.km) : "Consulte" },
    traseira: { t: "Opcionais", d: c.opcionais.length ? c.opcionais.join(", ") : "Consulte a lista completa com a nossa equipe" },
    porta: { t: "Entrar no carro", d: "Toque para sentar no banco do motorista", destaque: true },
  };
  camadaHotspots.innerHTML = "";
  const mapa = {};
  Object.entries(conteudo).forEach(([chave, info]) => {
    const b = document.createElement("button");
    b.className = `hotspot oculto${info.destaque ? " destaque" : ""}`;
    b.innerHTML = `<span class="ponto"></span><span class="balao"><b>${info.t}</b><span>${info.d}</span></span>`;
    b.setAttribute("aria-label", `${info.t}: ${info.d}`);
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      if (chave === "porta") return entrar();
      const ja = b.classList.contains("aberto");
      $$(".hotspot").forEach((h) => h.classList.remove("aberto"));
      b.classList.toggle("aberto", !ja);
    });
    camadaHotspots.appendChild(b);
    mapa[chave] = b;
  });
  return mapa;
}

function definirModo(modo) {
  if (modo === "piscar") {
    const p = $("#g-piscar");
    p.classList.remove("ativo"); void p.offsetWidth; p.classList.add("ativo");
    return;
  }
  elG.classList.remove("modo-exterior", "modo-interior", "modo-transicao");
  elG.classList.add(`modo-${modo}`);
  $("#g-painel").hidden = modo !== "interior";
  if (modo === "interior") prepararPainel();
  if (modo !== "interior") { som.desligarMotor(); $("#g-partida").classList.remove("ligado"); }
}

async function abrirCarro(id) {
  const c = CARROS.find((x) => x.id === id);
  if (!c) return;
  carroAtual = c;
  elG.hidden = false;
  document.body.classList.add("travado");
  elG.classList.remove("abrindo", "acelerando"); void elG.offsetWidth;
  elG.classList.add("abrindo", "acelerando");
  setTimeout(() => elG.classList.remove("acelerando"), 950);
  preencherInfo(c);
  $("#g-dica").classList.remove("some");
  $("#g-dica").innerHTML = `<span class="mao">⟷</span> Arraste para girar o carro`;
  definirModo("exterior");

  const m = await carregar3d();
  if (!m.webglDisponivel()) {
    $("#g-sem3d").hidden = false;
    $("#g-entrar").hidden = true;
    return;
  }
  if (!garagem) garagem = new m.Garagem(palco, { aoMudarModo: definirModo });
  garagem.definirCarro(c);
  garagem.definirHotspots(criarHotspots(c));
  garagem.iniciar();

  // Fotos 360° reais (quando a loja tiver)
  fotos360?.parar();
  fotos360 = c.giro360 && c.giro360.length ? iniciarFotos360(c.giro360) : null;
  $("#g-fotos360").hidden = !fotos360;
  $("#g-voltar").focus({ preventScroll: true });
}

function fecharCarro() {
  if (elG.hidden) return;
  garagem?.parar();
  fotos360?.parar();
  som.desligarMotor();
  elG.hidden = true;
  document.body.classList.remove("travado");
  const id = carroAtual?.id;
  carroAtual = null;
  setTimeout(() => {
    const card = id && document.querySelector(`.card[data-id="${id}"]`);
    card?.focus({ preventScroll: false });
  }, 50);
}

function sairDaGaragem() {
  if (abertoPorClique && history.length > 1) { abertoPorClique = false; history.back(); }
  else { history.replaceState(null, "", "#estoque"); fecharCarro(); $("#estoque").scrollIntoView(); }
}

async function entrar() {
  if (!garagem || !carroAtual) return;
  $$(".hotspot").forEach((h) => h.classList.remove("aberto"));
  if (fotos360) {
    // Exterior com fotos reais: zoom na foto e "senta" no carro
    definirModo("transicao");
    som.porta();
    const img = $("#g-fotos360 img");
    await img.animate([{ transform: "scale(1)" }, { transform: "scale(2.4)", opacity: 0 }], { duration: 900, easing: "ease-in" }).finished;
    definirModo("piscar");
    $("#g-fotos360").hidden = true;
    garagem.irParaInterior();
    definirModo("interior");
    img.style.transform = "";
    return;
  }
  await garagem.entrar();
}

async function sairDoCarro() {
  if (!garagem) return;
  if (fotos360) {
    definirModo("piscar");
    await esperar(350);
    garagem.modo = "exterior";
    garagem._esconderPanorama();
    $("#g-fotos360").hidden = false;
    definirModo("exterior");
    return;
  }
  await garagem.sair();
}

$("#g-entrar").addEventListener("click", entrar);
$("#g-sair").addEventListener("click", sairDoCarro);
$("#g-voltar").addEventListener("click", sairDaGaragem);
$("#g-som").addEventListener("click", (e) => {
  const on = som.alternar();
  e.currentTarget.textContent = on ? "🔊" : "🔇";
  e.currentTarget.setAttribute("aria-pressed", on);
  e.currentTarget.title = on ? "Desligar sons" : "Ligar sons";
});
elG.addEventListener("pointerdown", (e) => {
  if (!e.target.closest(".hotspot")) $$(".hotspot").forEach((h) => h.classList.remove("aberto"));
  setTimeout(() => $("#g-dica").classList.add("some"), 600);
});
document.addEventListener("keydown", (e) => {
  if (elG.hidden || e.key !== "Escape") return;
  if (elG.classList.contains("modo-interior")) sairDoCarro();
  else if (elG.classList.contains("modo-exterior")) sairDaGaragem();
});

// Rotas: #carro/<id> abre direto (link compartilhável)
function rota() {
  const m = location.hash.match(/^#carro\/(.+)$/);
  if (m) abrirCarro(decodeURIComponent(m[1]));
  else fecharCarro();
}
addEventListener("hashchange", rota);
rota();

/* ============================================================
   Painel de instrumentos (dentro do carro)
   ============================================================ */
function marcasGauge(svg, max, passo, limite) {
  const g = $(".marcas-gauge", svg);
  let html = "";
  for (let v = 0; v <= max; v += passo / 2) {
    const ang = (-135 + (270 * v) / max) * (Math.PI / 180);
    const forte = v % passo === 0;
    const r1 = forte ? 40 : 44, r2 = 50;
    const x1 = 60 + r1 * Math.sin(ang), y1 = 60 - r1 * Math.cos(ang);
    const x2 = 60 + r2 * Math.sin(ang), y2 = 60 - r2 * Math.cos(ang);
    html += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${forte ? "forte" : ""} ${limite && v >= limite ? "limite" : ""}"/>`;
    if (forte) html += `<text x="${60 + 30 * Math.sin(ang)}" y="${63 - 30 * Math.cos(ang)}">${v}</text>`;
  }
  g.innerHTML = html;
}
const ponteiro = (id, v, max) => {
  $(`#${id} .agulha`).style.transform = `rotate(${-135 + (270 * Math.min(v, max)) / max}deg)`;
};
marcasGauge($("#gauge-rpm svg"), 8, 1, 6.5);
marcasGauge($("#gauge-km svg"), 250, 50);

function lcd(a, b, c) {
  $("#lcd1").textContent = a; $("#lcd2").textContent = b; $("#lcd3").textContent = c;
}

function prepararPainel() {
  const c = carroAtual;
  if (!c) return;
  ponteiro("gauge-rpm", 0, 8);
  ponteiro("gauge-km", 0, 250);
  $("#odometro").textContent = c.km != null ? kmFmt(c.km) : "km";
  lcd("Bem-vindo a bordo", `${c.marca} ${c.modelo}`, `${c.ano ? c.ano + " · " : ""}${brl(c.preco)}`);
  setTimeout(() => ponteiro("gauge-km", (c.km || 0) / 1000, 250), 300);
}

$("#g-partida").addEventListener("click", async (e) => {
  const btn = e.currentTarget;
  const c = carroAtual;
  if (btn.classList.contains("ligado")) {
    btn.classList.remove("ligado");
    som.desligarMotor();
    ponteiro("gauge-rpm", 0, 8);
    lcd("Motor desligado", `${c.marca} ${c.modelo}`, brl(c.preco));
    return;
  }
  btn.classList.add("ligado");
  som.partida();
  if (navigator.vibrate) navigator.vibrate([60, 40, 120]);
  elG.classList.remove("vibrando"); void elG.offsetWidth; elG.classList.add("vibrando");
  ponteiro("gauge-rpm", 7.2, 8);
  lcd("Motor ligado", "Pronto para o test drive?", "Agende sua visita e dirija de verdade");
  await esperar(1100);
  ponteiro("gauge-rpm", 0.9, 8);
});
