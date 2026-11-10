/*
 * ESTOQUE DA LOJA
 * ---------------------------------------------------------------
 * Para adicionar um carro, copie um bloco e altere os dados.
 * Campos que não souber, deixe como null: o site esconde sozinho.
 *
 * carroceria: "sedan" | "hatch" | "suv" | "suvCoupe" | "esportivo" | "buggy"
 *   (define o formato do modelo 3D provisório)
 *
 * FOTOS REAIS (opcional, substituem o 3D provisório):
 *   fotos:     ["fotos/x6/capa.jpg", ...]           -> capa do card + galeria
 *   giro360:   ["fotos/x6/360/01.jpg", ... "36.jpg"] -> fotos tiradas em volta do carro
 *   panorama:  "fotos/x6/interior-360.jpg"           -> foto 360° do interior (equirretangular)
 */

export const LOJA = {
  nome: "UK Multimarcas",
  slogan: "A maior de Londrina",
  telefone: "(43) 3326-2227",
  telefoneLink: "+554333262227",
  whatsapp: "(43) 98403-4492",
  whatsappLink: "5543984034492",
  endereco: "Av. Arcebispo Dom Geraldo Fernandes, 3070 - Centro, Londrina/PR",
  mapa: "https://www.google.com/maps/search/?api=1&query=Av.+Arcebispo+Dom+Geraldo+Fernandes,+3070,+Londrina+PR",
  instagram: "https://www.instagram.com/",
  facebook: "https://www.facebook.com/",
};

export const CARROS = [
  {
    id: "bmw-x6-m-2014",
    marca: "BMW",
    modelo: "X6 M GZ01",
    ano: 2014,
    preco: 149900,
    km: 144000,
    combustivel: "Gasolina",
    cor: "Branco",
    corHex: "#f2f3f5",
    interiorHex: "#1a1a1d",
    carroceria: "suvCoupe",
    destaque: true,
    opcionais: ["Airbag", "Alarme", "Apoio de braço"],
    fotos: [],
    giro360: [],
    panorama: null,
  },
  {
    id: "chevrolet-corvette-3lt-conv-2024",
    marca: "Chevrolet",
    modelo: "Corvette 3LT Conv",
    ano: 2024,
    preco: 1250000,
    km: 3000,
    combustivel: "Gasolina",
    cor: "Vermelho",
    corHex: "#d8141c",
    interiorHex: "#2a0d0f",
    carroceria: "esportivo",
    destaque: true,
    opcionais: [],
    fotos: [],
    giro360: [],
    panorama: null,
  },
  {
    id: "ford-mondeo-clx-fd-1997",
    marca: "Ford",
    modelo: "Mondeo CLX FD",
    ano: 1997,
    preco: 14900,
    km: 183399,
    combustivel: "Gasolina",
    cor: "Cinza",
    corHex: "#4b4f63",
    interiorHex: "#26272c",
    carroceria: "sedan",
    destaque: true,
    opcionais: ["Alarme", "Ar-condicionado", "Ar quente"],
    fotos: [],
    giro360: [],
    panorama: null,
  },
  {
    id: "fiat-argo-1-0",
    marca: "Fiat",
    modelo: "Argo 1.0",
    ano: null,
    preco: 56900,
    km: 90000,
    combustivel: null,
    cor: "Branco",
    corHex: "#eef0f2",
    interiorHex: "#1c1c1f",
    carroceria: "hatch",
    opcionais: [],
    fotos: [],
    giro360: [],
    panorama: null,
  },
  {
    id: "jeep-renegade-lgtd-t270",
    marca: "Jeep",
    modelo: "Renegade LGTD T270",
    ano: null,
    preco: 109900,
    km: 45574,
    combustivel: null,
    cor: "Preto",
    corHex: "#16181b",
    interiorHex: "#1d1d20",
    carroceria: "suv",
    opcionais: [],
    fotos: [],
    giro360: [],
    panorama: null,
  },
  {
    id: "volkswagen-coyote",
    marca: "Volkswagen",
    modelo: "Coyote",
    ano: null,
    preco: 50000,
    km: 24601,
    combustivel: null,
    cor: "Amarelo",
    corHex: "#f4c400",
    interiorHex: "#141416",
    carroceria: "buggy",
    opcionais: [],
    fotos: [],
    giro360: [],
    panorama: null,
  },
];

export const brl = (v) =>
  v == null ? "Consulte" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const kmFmt = (v) => (v == null ? "—" : `${v.toLocaleString("pt-BR")} km`);

export const whatsappUrl = (texto) =>
  `https://wa.me/${LOJA.whatsappLink}?text=${encodeURIComponent(texto)}`;
