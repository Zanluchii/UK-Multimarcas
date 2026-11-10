# UK Multimarcas: site com experiência 360°

Site da **UK Multimarcas** (Londrina/PR) com tema de Fórmula 1 e uma experiência interativa: o cliente gira o carro em 360° no showroom e **entra nele** pelo site.

## O que tem

- **Largada F1** no topo: as 5 luzes vermelhas acendem e apagam, e a página "larga". Clique no semáforo para repetir.
- **Grid de largada**: o estoque em cards (P1, P2...), com filtro por marca e busca.
- **Garagem 360°** ao clicar num carro:
  1. o card se expande para a tela cheia;
  2. o carro aparece girando no showroom (piso quadriculado vermelho e preto e pistas de F1 em neon nas paredes);
  3. o cliente arrasta para girar, usa a roda do mouse ou a pinça para zoom e toca nos pontos de destaque;
  4. em **Entrar no carro**, a câmera vai até a porta e senta no banco do motorista;
  5. dentro do carro: olhar em volta, painel com preço, km e ano, botão **Start Engine** (com som opcional);
  6. **Agendar visita** abre o WhatsApp da loja com o nome do carro na mensagem.
- **Paixão F1**: os circuitos das paredes da loja, desenhados com animação.
- Link direto para cada carro, para enviar ao cliente: `seusite.com.br/#carro/bmw-x6-m-2014`.
- Funciona em celular e computador e respeita o "reduzir movimento" do sistema.

## Imagens provisórias

Enquanto não chegam as fotos da loja, cada carro aparece como um **modelo 3D ilustrativo** na cor do veículo, e as capas dos cards são geradas a partir dele. O site avisa que é uma imagem ilustrativa.

## Como colocar as fotos reais

Edite `js/cars.js`. Em cada carro:

```js
fotos:    ["fotos/x6/capa.jpg"],                    // capa do card
giro360:  ["fotos/x6/360/01.jpg", /* ... */ "fotos/x6/360/36.jpg"], // exterior 360°
panorama: "fotos/x6/interior-360.jpg",              // interior 360°
```

- **Exterior 360°**: de 24 a 36 fotos andando em volta do carro, sempre na mesma altura e distância, em sequência. Com elas, o giro passa a usar as fotos reais.
- **Interior 360°**: uma foto panorâmica 360° (formato equirretangular, 2:1) tirada do banco do motorista. Com ela, ao "entrar no carro" o cliente vê o interior de verdade.

Para adicionar ou remover carros do estoque, basta copiar ou apagar um bloco em `js/cars.js`.

## Rodar localmente

O site é estático (HTML, CSS e JS, sem build). Por usar módulos JavaScript, precisa ser aberto por um servidor, e não com duplo clique no arquivo:

```bash
python3 -m http.server 8000
```

Depois acesse http://localhost:8000. Para publicar, serve qualquer hospedagem estática (GitHub Pages, Netlify, Vercel, a hospedagem atual da loja).

## Estrutura

| Arquivo | O que faz |
|---|---|
| `index.html` | Página |
| `css/style.css` | Visual (cores UK, tema F1, responsivo) |
| `js/cars.js` | **Estoque e dados da loja**: é aqui que se edita |
| `js/app.js` | Cards, filtros, largada, abertura da garagem, painel |
| `js/garagem3d.js` | Showroom 3D, giro 360°, entrada no carro |
| `js/carModel.js` | Modelo 3D provisório de cada carroceria |
| `js/circuits.js` | Traçados (estilizados) dos circuitos de F1 |
| `js/audio.js` | Sons sintetizados (porta, partida) |
| `vendor/` | three.js r160 (licença MIT) |
