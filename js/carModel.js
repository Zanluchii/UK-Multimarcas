/*
 * Modelo 3D PROVISÓRIO de cada carro, gerado por código a partir do tipo de
 * carroceria e da cor. Serve enquanto a loja não tem as fotos 360° reais.
 * Eixos: frente do carro = +X, para cima = +Y, lado do motorista = -Z.
 */
import * as THREE from "three";
import { toCreasedNormals } from "../vendor/BufferGeometryUtils.js";

// Dimensões aproximadas (metros) de cada tipo de carroceria
const PERFIS = {
  sedan:     { L: 4.60, W: 1.75, r: 0.33, xf: 1.40, xr: -1.35, ground: 0.18, noseH: 0.64, beltF: 0.88, beltR: 0.94, tailH: 0.86, ws: 0.78, roofF: 0.12, roofR: -0.95, rgBase: -1.55, roofH: 1.40 },
  hatch:     { L: 4.00, W: 1.72, r: 0.31, xf: 1.25, xr: -1.22, ground: 0.20, noseH: 0.68, beltF: 0.90, beltR: 0.98, tailH: 0.95, ws: 0.72, roofF: 0.05, roofR: -1.45, rgBase: -1.88, roofH: 1.48 },
  suv:       { L: 4.25, W: 1.80, r: 0.37, xf: 1.32, xr: -1.25, ground: 0.30, noseH: 0.92, beltF: 1.06, beltR: 1.10, tailH: 1.06, ws: 0.92, roofF: 0.42, roofR: -1.80, rgBase: -2.02, roofH: 1.70 },
  suvCoupe:  { L: 4.85, W: 1.95, r: 0.39, xf: 1.50, xr: -1.45, ground: 0.28, noseH: 0.84, beltF: 1.02, beltR: 1.06, tailH: 0.98, ws: 0.90, roofF: 0.22, roofR: -1.15, rgBase: -2.10, roofH: 1.62 },
  esportivo: { L: 4.63, W: 1.93, r: 0.35, xf: 1.50, xr: -1.35, ground: 0.14, noseH: 0.46, beltF: 0.76, beltR: 0.90, tailH: 0.88, ws: 0.42, roofF: -0.12, roofR: -0.12, rgBase: -0.95, roofH: 1.12, aberto: true },
  buggy:     { L: 3.60, W: 1.65, r: 0.34, xf: 1.15, xr: -1.10, ground: 0.32, noseH: 0.76, beltF: 0.82, beltR: 0.88, tailH: 0.84, ws: 0.62, roofF: 0.40, roofR: 0.40, rgBase: -0.95, roofH: 1.18, aberto: true, buggy: true },
};

const lerp = (a, b, t) => a + (b - a) * t;

function chaikin(pts, iteracoes) {
  let p = pts;
  for (let k = 0; k < iteracoes; k++) {
    const out = [];
    for (let i = 0; i < p.length; i++) {
      const a = p[i], b = p[(i + 1) % p.length];
      out.push([lerp(a[0], b[0], 0.25), lerp(a[1], b[1], 0.25)], [lerp(a[0], b[0], 0.75), lerp(a[1], b[1], 0.75)]);
    }
    p = out;
  }
  return p;
}

// Recorta um polígono mantendo a parte com xmin <= x <= xmax (Sutherland–Hodgman)
function recortarX(poly, xmin, xmax) {
  const corte = (pts, dentro, xc) => {
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      const da = dentro(a), db = dentro(b);
      if (da) out.push(a);
      if (da !== db) {
        const t = (xc - a[0]) / (b[0] - a[0]);
        out.push([xc, lerp(a[1], b[1], t)]);
      }
    }
    return out;
  };
  let r = corte(poly, (p) => p[0] >= xmin, xmin);
  r = corte(r, (p) => p[0] <= xmax, xmax);
  return r;
}

function perfilLateral(P) {
  const { L, r, xf, xr, ground, noseH, beltF, beltR, tailH, ws, rgBase } = P;
  const R = r + 0.07;
  const pts = [[L / 2 - 0.1, ground]];
  const arco = (cx) => {
    const t0 = Math.asin(Math.max(-1, Math.min(1, (ground - r) / R)));
    for (let i = 0; i <= 16; i++) {
      const t = t0 + ((Math.PI - 2 * t0) * i) / 16;
      pts.push([cx + R * Math.cos(t), r + R * Math.sin(t)]);
    }
  };
  arco(xf);
  arco(xr);
  pts.push([-L / 2 + 0.1, ground], [-L / 2, ground + 0.14], [-L / 2, tailH - 0.08], [-L / 2 + 0.1, tailH]);
  if (rgBase - -L / 2 > 0.35) pts.push([lerp(-L / 2, rgBase, 0.5), lerp(tailH, beltR, 0.6) + 0.02]);
  pts.push([rgBase, beltR], [lerp(rgBase, ws, 0.5), lerp(beltR, beltF, 0.5)], [ws, beltF]);
  pts.push([lerp(ws, L / 2, 0.5), lerp(beltF, noseH, 0.45) + 0.03], [L / 2 - 0.12, noseH], [L / 2, noseH - 0.12], [L / 2, ground + 0.14]);
  return chaikin(pts, 2);
}

function shapeDe(pts) {
  const s = new THREE.Shape();
  s.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
  s.closePath();
  return s;
}

function extrudar(pts, profundidade, z0, mat, bisel = 0.04) {
  let geo = new THREE.ExtrudeGeometry(shapeDe(pts), {
    depth: profundidade, bevelEnabled: true, bevelThickness: bisel, bevelSize: bisel, bevelSegments: 4, curveSegments: 4,
  });
  geo.translate(0, 0, z0);
  geo = toCreasedNormals(geo, Math.PI / 3.2); // lataria lisa, mantendo os vincos
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// Faixa (ribbon) que percorre uma polilinha atravessando o carro de -w/2 a +w/2
function faixa(pts, w, mat) {
  const pos = [], idx = [];
  pts.forEach(([x, y]) => pos.push(x, y, -w / 2, x, y, w / 2));
  for (let i = 0; i < pts.length - 1; i++) {
    const a = i * 2;
    idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, mat);
}

function telaCentral(carro) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 300;
  const g = c.getContext("2d");
  const grad = g.createLinearGradient(0, 0, 512, 300);
  grad.addColorStop(0, "#07090f"); grad.addColorStop(1, "#141b33");
  g.fillStyle = grad; g.fillRect(0, 0, 512, 300);
  g.strokeStyle = "#e10600"; g.lineWidth = 14;
  g.beginPath(); g.arc(256, 112, 60, 0, Math.PI * 2); g.stroke();
  g.fillStyle = "#1f3a93"; g.fillRect(146, 94, 220, 36);
  g.fillStyle = "#fff"; g.font = "bold 26px sans-serif"; g.textAlign = "center";
  g.fillText("UK MULTIMARCAS", 256, 122);
  g.font = "bold 30px sans-serif";
  g.fillText(`${carro.marca} ${carro.modelo}`.toUpperCase().slice(0, 28), 256, 228);
  g.fillStyle = "#9aa3b8"; g.font = "22px sans-serif";
  g.fillText("Bem-vindo a bordo", 256, 266);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function criarCarro(carro) {
  const P = { ...(PERFIS[carro.carroceria] || PERFIS.sedan) };
  const { L, W, r, xf, xr, ground, noseH, beltF, beltR, tailH, ws, roofF, roofR, rgBase, roofH } = P;
  const grupo = new THREE.Group();

  const cor = new THREE.Color(carro.corHex || "#888");
  const claro = cor.getHSL({}).l > 0.75;
  const pintura = new THREE.MeshPhysicalMaterial({
    color: cor, metalness: claro ? 0.15 : 0.55, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.05,
  });
  const vidro = new THREE.MeshPhysicalMaterial({
    color: 0x05070a, metalness: 0.3, roughness: 0.03, transparent: true, opacity: 0.8,
    side: THREE.DoubleSide, depthWrite: false,
  });
  const preto = new THREE.MeshStandardMaterial({ color: 0x0b0b0d, roughness: 0.55, metalness: 0.2 });
  const borracha = new THREE.MeshStandardMaterial({ color: 0x111113, roughness: 0.9 });
  const cromo = new THREE.MeshStandardMaterial({ color: 0xc9ccd2, metalness: 1, roughness: 0.18 });
  const interior = new THREE.MeshStandardMaterial({ color: new THREE.Color(carro.interiorHex || "#1b1b1e"), roughness: 0.7 });
  const acabamento = new THREE.MeshStandardMaterial({ color: 0x18191c, roughness: 0.5, metalness: 0.3 });

  // ---------- Carroceria: frente, traseira e laterais (portas) ----------
  const perfil = perfilLateral(P);
  const b = 0.04;
  const largInterna = W - 2 * b;
  const frente = recortarX(perfil, ws - 0.02, 99);
  const traseira = recortarX(perfil, -99, rgBase + 0.02);
  const meio = recortarX(perfil, rgBase, ws);
  grupo.add(extrudar(frente, largInterna, -largInterna / 2, pintura, b));
  grupo.add(extrudar(traseira, largInterna, -largInterna / 2, pintura, b));
  const esp = 0.07;
  grupo.add(extrudar(meio, esp, W / 2 - b - esp, pintura, b));
  grupo.add(extrudar(meio, esp, -W / 2 + b, pintura, b));

  // Assoalho
  const piso = new THREE.Mesh(new THREE.BoxGeometry(ws - rgBase, 0.08, W - 0.2), interior);
  piso.position.set((ws + rgBase) / 2, ground + 0.14, 0);
  grupo.add(piso);

  // ---------- Vidros / cabine ----------
  if (!P.aberto) {
    const base = [[rgBase - 0.05, beltR - 0.1], [ws + 0.05, beltF - 0.1]];
    const cab = chaikin([...base, [ws, beltF], [roofF, roofH], [roofR, roofH], [rgBase, beltR]], 2);
    const wv = W * 0.84;
    // Janelas laterais
    const ladoGeo = new THREE.ShapeGeometry(shapeDe(cab));
    [-1, 1].forEach((s) => {
      const lado = new THREE.Mesh(ladoGeo, vidro);
      lado.position.z = (s * wv) / 2;
      grupo.add(lado);
    });
    // Para-brisa, teto e vidro traseiro: só a parte de cima do contorno
    const topo = cab.filter((p) => p[1] > Math.min(beltF, beltR) - 0.04);
    topo.sort((a, b2) => b2[0] - a[0]);
    grupo.add(faixa(topo, wv, vidro));
    // Teto pintado
    const teto = topo.filter((p) => p[1] > roofH - 0.06).map(([x, y]) => [x, y + 0.006]);
    if (teto.length > 1) {
      const t = faixa(teto, wv * 0.97, pintura);
      t.material = pintura.clone();
      t.material.side = THREE.DoubleSide;
      grupo.add(t);
    }
    // Colunas B
    [-1, 1].forEach((s) => {
      const coluna = new THREE.Mesh(new THREE.BoxGeometry(0.08, roofH - beltF, 0.03), preto);
      coluna.position.set((roofF + roofR) / 2 + 0.1, (roofH + beltF) / 2 - 0.02, (s * wv) / 2);
      grupo.add(coluna);
    });
  } else {
    // Só o para-brisa (conversível / buggy)
    const wv = W * 0.8;
    const pb = faixa([[ws, beltF], [roofF, roofH]], wv, vidro);
    grupo.add(pb);
    const moldura = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, wv), preto);
    moldura.position.set(roofF, roofH, 0);
    grupo.add(moldura);
    if (P.buggy) {
      const arco = new THREE.Mesh(new THREE.TorusGeometry(W * 0.42, 0.04, 12, 40, Math.PI), cromo);
      arco.rotation.y = Math.PI / 2;
      arco.position.set(rgBase + 0.15, beltR, 0);
      grupo.add(arco);
    }
  }

  // ---------- Rodas ----------
  const rodas = [];
  const rodaGeo = new THREE.CylinderGeometry(r, r, 0.24, 36);
  const aroGeo = new THREE.CylinderGeometry(r * 0.64, r * 0.64, 0.245, 28);
  const raioGeo = new THREE.BoxGeometry(r * 1.15, 0.05, 0.02);
  [xf, xr].forEach((x) => {
    [-1, 1].forEach((s) => {
      const roda = new THREE.Group();
      const pneu = new THREE.Mesh(rodaGeo, borracha);
      pneu.rotation.x = Math.PI / 2;
      pneu.castShadow = true;
      const aro = new THREE.Mesh(aroGeo, cromo);
      aro.rotation.x = Math.PI / 2;
      roda.add(pneu, aro);
      for (let k = 0; k < 5; k++) {
        const raio = new THREE.Mesh(raioGeo, cromo);
        raio.rotation.z = (k * Math.PI) / 5;
        raio.position.z = s * 0.125;
        roda.add(raio);
      }
      roda.position.set(x, r, s * (W / 2 - 0.1));
      grupo.add(roda);
      rodas.push(roda);
    });
  });

  // ---------- Faróis, lanternas e grade ----------
  const farolMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xdfe8ff, emissiveIntensity: 1.6 });
  const lanternaMat = new THREE.MeshStandardMaterial({ color: 0x550000, emissive: 0xff1a1a, emissiveIntensity: 1.8 });
  // posição real da lataria naquela altura (o contorno é arredondado)
  const pontaX = (y, sinal) => {
    const perto = perfil.filter((p) => Math.abs(p[1] - y) < 0.07 && Math.sign(p[0]) === sinal);
    if (!perto.length) return sinal * (L / 2);
    return sinal > 0 ? Math.max(...perto.map((p) => p[0])) + b : Math.min(...perto.map((p) => p[0])) - b;
  };
  const yFarol = Math.max(ground + 0.2, noseH - 0.16);
  const yLanterna = tailH - 0.16;
  const yGrade = Math.max(ground + 0.18, yFarol - 0.1);
  [-1, 1].forEach((s) => {
    const farol = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, W * 0.2), farolMat);
    farol.position.set(pontaX(yFarol, 1) - 0.035, yFarol, s * W * 0.31);
    grupo.add(farol);
    const lanterna = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, W * 0.22), lanternaMat);
    lanterna.position.set(pontaX(yLanterna, -1) + 0.035, yLanterna, s * W * 0.31);
    grupo.add(lanterna);
  });
  const grade = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, W * 0.34), preto);
  grade.position.set(pontaX(yGrade, 1) - 0.035, yGrade, 0);
  grupo.add(grade);
  // saia inferior escura (dá peso e define a silhueta)
  const saia = new THREE.Mesh(new THREE.BoxGeometry(Math.abs(xf - xr) - 2 * r - 0.25, 0.1, W + 0.02), preto);
  saia.position.set((xf + xr) / 2, ground + 0.06, 0);
  grupo.add(saia);

  // ---------- Interior ----------
  const motoristaZ = -W * 0.23;
  const assentoX = Math.max(rgBase + 0.42, ws - 1.0);
  const almofadaY = Math.max(ground + 0.3, beltF - 0.46);
  const olhosY = P.aberto ? almofadaY + 0.66 : Math.min(almofadaY + 0.68, roofH - 0.2);

  const banco = (x, z) => {
    const g = new THREE.Group();
    const assento = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.5), interior);
    assento.position.set(0, 0, 0);
    const encosto = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.62, 0.5), interior);
    encosto.position.set(-0.28, 0.3, 0);
    encosto.rotation.z = 0.2;
    const cabeca = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.18, 0.3), interior);
    cabeca.position.set(-0.36, 0.72, 0);
    cabeca.rotation.z = 0.2;
    g.add(assento, encosto, cabeca);
    g.position.set(x, almofadaY - 0.06, z);
    return g;
  };
  grupo.add(banco(assentoX, motoristaZ), banco(assentoX, -motoristaZ));
  if (assentoX - 0.9 > rgBase + 0.2) {
    const traseiro = banco(assentoX - 0.9, 0);
    traseiro.scale.set(1, 1, 2.6);
    grupo.add(traseiro);
  }

  // Painel
  const painelProf = Math.min(0.55, ws - assentoX - 0.55);
  const painelX = ws - painelProf / 2 - 0.02;
  const painel = new THREE.Mesh(new THREE.BoxGeometry(painelProf, 0.26, W - 0.18), acabamento);
  painel.position.set(painelX, beltF - 0.1, 0);
  grupo.add(painel);
  // Tela central
  const tela = new THREE.Mesh(
    new THREE.PlaneGeometry(0.34, 0.2),
    new THREE.MeshBasicMaterial({ map: telaCentral(carro), toneMapped: false })
  );
  tela.rotation.y = -Math.PI / 2;
  tela.rotation.z = 0.12;
  tela.position.set(painelX - painelProf / 2 - 0.012, beltF - 0.06, 0);
  grupo.add(tela);
  // Console central
  const console_ = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.22, 0.22), acabamento);
  console_.position.set(assentoX + 0.25, almofadaY - 0.02, 0);
  grupo.add(console_);
  // Quadro de instrumentos
  const quadro = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.36), preto);
  quadro.position.set(painelX - painelProf / 2 + 0.02, beltF + 0.01, motoristaZ);
  grupo.add(quadro);
  const mostrador = new THREE.Mesh(
    new THREE.PlaneGeometry(0.3, 0.09),
    new THREE.MeshBasicMaterial({ color: 0x1b3a8f, toneMapped: false })
  );
  mostrador.rotation.y = -Math.PI / 2;
  mostrador.position.set(painelX - painelProf / 2 - 0.045, beltF + 0.01, motoristaZ);
  grupo.add(mostrador);
  // Volante
  const volante = new THREE.Group();
  const aroV = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.024, 12, 40), preto);
  const cubo = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.05, 20), acabamento);
  cubo.rotation.x = Math.PI / 2;
  const travessa = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.03, 0.02), preto);
  const logoV = new THREE.Mesh(new THREE.CircleGeometry(0.03, 20), new THREE.MeshBasicMaterial({ color: 0xe10600 }));
  logoV.position.z = 0.027;
  volante.add(aroV, cubo, travessa, logoV);
  // vira de frente para o motorista (-X) e inclina o topo para a frente
  volante.rotation.order = "ZYX";
  volante.rotation.set(0, -Math.PI / 2, -0.35);
  const volanteX = painelX - painelProf / 2 - 0.2;
  volante.position.set(volanteX, olhosY - 0.3, motoristaZ);
  grupo.add(volante);

  // ---------- Pontos de interesse (hotspots) ----------
  const ancoras = [
    { chave: "frente", pos: new THREE.Vector3(L / 2 + 0.05, noseH + 0.08, 0), normal: new THREE.Vector3(1, 0.2, 0) },
    { chave: "roda", pos: new THREE.Vector3(xf, r + 0.05, W / 2 + 0.12), normal: new THREE.Vector3(0, 0, 1) },
    { chave: "traseira", pos: new THREE.Vector3(-L / 2 - 0.05, tailH, 0), normal: new THREE.Vector3(-1, 0.2, 0) },
    { chave: "porta", pos: new THREE.Vector3(assentoX + 0.2, beltF + 0.12, -W / 2 - 0.08), normal: new THREE.Vector3(0, 0, -1) },
  ];

  return {
    grupo,
    rodas,
    vidro,
    perfil: P,
    ancoras,
    olhos: new THREE.Vector3(assentoX - 0.02, olhosY, motoristaZ),
    janela: new THREE.Vector3(assentoX + 0.1, olhosY + 0.05, -W / 2 - 1.9),
    alvoCentro: new THREE.Vector3(0, (roofH + ground) / 2, 0),
  };
}
