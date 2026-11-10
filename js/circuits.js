/*
 * Circuitos de F1 (traçados estilizados, inspirados nas pistas das paredes da loja).
 * Os pontos vão de 0 a 100 e são suavizados automaticamente.
 * Para trocar por traçados exatos, basta substituir "pontos" ou usar um SVG próprio.
 */
export const CIRCUITOS = [
  {
    nome: "Interlagos",
    pais: "Brasil",
    bandeira: "🇧🇷",
    extensao: "4,309 km",
    pontos: [[78,88],[82,60],[86,30],[80,14],[66,10],[60,20],[66,32],[60,44],[46,40],[34,30],[22,22],[12,30],[16,46],[30,56],[40,66],[34,78],[20,82],[16,92],[30,96],[60,94]],
  },
  {
    nome: "Silverstone",
    pais: "Reino Unido",
    bandeira: "🇬🇧",
    extensao: "5,891 km",
    pontos: [[20,80],[40,86],[56,78],[70,82],[86,72],[90,58],[80,48],[86,34],[78,20],[62,18],[52,28],[40,22],[26,26],[30,40],[18,52],[10,66]],
  },
  {
    nome: "Monza",
    pais: "Itália",
    bandeira: "🇮🇹",
    extensao: "5,793 km",
    pontos: [[10,70],[60,72],[88,70],[94,62],[88,52],[70,48],[66,40],[72,30],[66,18],[50,14],[40,22],[30,32],[18,44],[8,56]],
  },
  {
    nome: "Spa-Francorchamps",
    pais: "Bélgica",
    bandeira: "🇧🇪",
    extensao: "7,004 km",
    pontos: [[12,84],[30,88],[48,80],[66,70],[84,56],[92,40],[86,24],[74,14],[62,20],[56,34],[44,42],[34,36],[22,46],[14,62]],
  },
  {
    nome: "Mônaco",
    pais: "Mônaco",
    bandeira: "🇲🇨",
    extensao: "3,337 km",
    pontos: [[20,70],[34,74],[46,66],[58,72],[72,64],[84,68],[90,56],[78,46],[82,34],[70,28],[58,36],[50,26],[38,30],[30,44],[18,48],[12,60]],
  },
];

/** Caminho SVG fechado e suave (Catmull-Rom -> Bézier). */
export function caminhoSVG(pts) {
  const n = pts.length;
  const p = (i) => pts[(i + n) % n];
  let d = `M${p(0)[0]},${p(0)[1]}`;
  for (let i = 0; i < n; i++) {
    const [x0, y0] = p(i - 1), [x1, y1] = p(i), [x2, y2] = p(i + 1), [x3, y3] = p(i + 2);
    const c1x = x1 + (x2 - x0) / 6, c1y = y1 + (y2 - y0) / 6;
    const c2x = x2 - (x3 - x1) / 6, c2y = y2 - (y3 - y1) / 6;
    d += ` C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${x2},${y2}`;
  }
  return d + "Z";
}

/** Pontos suavizados (para desenhar o neon em 3D). */
export function pontosSuaves(pts, passos = 8) {
  const n = pts.length, out = [];
  const p = (i) => pts[(i + n) % n];
  for (let i = 0; i < n; i++) {
    const p0 = p(i - 1), p1 = p(i), p2 = p(i + 1), p3 = p(i + 2);
    for (let s = 0; s < passos; s++) {
      const t = s / passos, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  return out;
}
