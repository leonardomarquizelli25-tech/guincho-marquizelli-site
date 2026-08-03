# Especificação visual do site - Guincho Marquizelli

## 1. Fontes analisadas

Esta especificação foi construída a partir dos arquivos locais disponíveis em `Inspiração/` e do `manual_de_marca.pdf`.

- `404 Error.jfif`: página longa de uma empresa de bicicletas, usada como referência para recortes diagonais, alternância entre áreas claras e escuras e integração entre fotografia e conteúdo.
- `CarHive - Car Repair & Auto Service Elementor Template Kit.jfif`: landing page automotiva, usada como referência para a organização comercial das seções, CTAs, cartões e hierarquia de conteúdo.
- `manual_de_marca.pdf`: fonte oficial para paleta, tipografia, espaçamentos, padrões gráficos e posicionamento da marca.
- `IMG_1766.JPG`, `IMG_1773.JPG`, `IMG_4674.jpg` e `IMG_4676.jpg`: fotos reais usadas para definir os enquadramentos da seção de frota e do hero.

Observação de conteúdo: o documento mestre institucional citado no briefing não estava presente no workspace no momento da análise. Por isso, nenhum dado institucional foi acrescentado além do manual de marca e do que foi informado diretamente no briefing.

## 2. Estrutura de seções observada

### Referência CarHive

1. Barra utilitária com contato e horário.
2. Navegação principal com logo, links e CTA destacado.
3. Hero comercial com título grande, texto curto, CTA e prova social.
4. Bloco institucional em duas colunas, com texto de um lado e fotografia do outro.
5. Faixa de parceiros ou selos.
6. Serviços em cartões sobrepostos a uma imagem/fundo escuro.
7. Indicadores numéricos.
8. Bloco de confiança/diferenciais.
9. Equipe, processo, depoimentos, galeria e planos.
10. CTA final e rodapé escuro.

### Referência diagonal de bicicletas

1. Navegação compacta sobre fundo claro.
2. Hero assimétrico com fotografia recortada por diagonais.
3. Sequência narrativa de blocos alternados em preto e branco.
4. Fotografias atravessando os limites entre seções.
5. Títulos em caixa alta sobre faixas translúcidas.
6. Conteúdo textual organizado em duas ou três colunas estreitas.
7. Grandes áreas de respiro usadas como parte ativa da composição.
8. Encerramento com logos/parceiros inseridos em uma massa gráfica escura.

### Estrutura adotada para a Guincho Marquizelli

1. Cabeçalho fixo: logo, navegação e CTA “Chamar agora”.
2. Hero de tela cheia: promessa da marca, serviços principais, foto real e CTA.
3. Faixa de movimento: carros, caminhões, tratores e região de Marília.
4. Serviços: três painéis, um para cada tipo de veículo informado.
5. Posicionamento: força, agilidade e confiança.
6. Frota: trilho fotográfico horizontal no desktop e carrossel por toque no mobile.
7. Área de atuação: região de Marília, com composição tipográfica de grande escala.
8. CTA final: WhatsApp, telefone e Instagram.
9. Rodapé: navegação resumida e dados confirmados.

## 3. Layout e grid

- Base mobile-first com uma coluna e espaçamento lateral de 20 a 24 px.
- Container desktop de até 1.280 px, centralizado.
- Grid desktop de 12 colunas; seções editoriais usam divisões 5/7, 6/6 e 4/4/4.
- Unidade-base digital de 8 px, conforme o manual. Espaçamentos principais: 8, 16, 24, 32, 48, 64, 96 e 128 px.
- Fotografias em grande escala, com recortes diagonais entre 8 e 12 graus.
- Cartões com cantos discretos ou retos; a robustez vem de bordas, massa tipográfica e contraste, não de sombras excessivas.
- Elementos importantes alinhados a eixos visuais firmes, com títulos invadindo parcialmente o espaço da imagem em telas grandes.
- Áreas claras e escuras alternadas para criar ritmo e separar conteúdo operacional de conteúdo institucional.

## 4. Paleta

### Paleta observada nas inspirações

- Preto/carvão como fundo dominante e base de contraste.
- Branco e cinza claro para grandes áreas de leitura.
- Vermelho vivo como cor de ação e marcação de CTAs.
- Amarelo usado de modo pontual em sinalização e pequenos destaques.

### Paleta oficial aplicada

| Papel | Cor | Uso no site |
| --- | --- | --- |
| Vermelho de Ação | `#E31E24` | CTAs, destaques, linhas e transições |
| Preto Industrial | `#1A1A1A` | fundos, cabeçalho, tipografia de alto contraste |
| Amarelo Sinalização | `#FFC72C` | etiqueta 24h, faixas de alerta e pequenos acentos |
| Cinza Aço | `#8A8D8F` | texto secundário, metadados e divisórias |
| Branco Gelo | `#F4F4F4` | fundo principal e texto reverso |

A composição segue a recomendação 60/30/8/2 do manual. O amarelo não ocupa grandes superfícies.

## 5. Tipografia

### Padrões observados

- Títulos condensados, pesados e em caixa alta.
- Corpo simples e funcional, com linhas curtas.
- Eyebrows com tracking alto para orientar a leitura.
- Números e palavras-chave em escala muito maior que o texto de apoio.

### Sistema oficial aplicado

- **Anton 400**: assinatura tipográfica de impacto e palavras display.
- **Oswald 700**: H1, H2, H3, navegação e categorias.
- **Barlow 400/700**: corpo, botões, legendas e dados de contato.
- As fontes são hospedadas localmente em `assets/fonts/` no formato WOFF2.
- Títulos usam caixa alta, line-height compacto e tamanhos fluidos com `clamp()`.
- O corpo mantém line-height entre 1,5 e 1,7 para leitura confortável.

## 6. Movimento e animações de scroll

As referências fornecidas são capturas estáticas, portanto não permitem confirmar animações existentes. Os movimentos abaixo foram inferidos a partir da composição e escolhidos para reproduzir o ritmo visual sem atribuir comportamento não observável às referências.

- **Fade-in + deslocamento vertical**: entrada de títulos, textos e cartões quando entram no viewport.
- **Reveal por máscara**: títulos surgem por dentro de uma janela com `overflow: hidden`.
- **Parallax discreto**: foto principal e fundos se movem em velocidade diferente do conteúdo.
- **Seção sticky/pinned**: a frota permanece fixa no desktop enquanto os cartões avançam horizontalmente.
- **Scrub sincronizado**: deslocamento da frota e linha de progresso respondem diretamente à posição do scroll.
- **Wipe diagonal**: transição inicial vermelha e entradas de imagens coerentes com o ângulo de 8 a 12 graus da marca.
- **Marquee contínuo**: faixa curta com os tipos de veículos, usada como transição entre hero e serviços.
- **Microinterações**: setas e fundos dos botões se deslocam no hover/focus; menu muda de estado após o primeiro scroll.

Todos os efeitos respeitam `prefers-reduced-motion: reduce`. Sem JavaScript ou sem GSAP, o conteúdo continua visível e navegável.

## 7. Direção fotográfica

- Perspectiva baixa ou três-quartos para ampliar a presença dos caminhões.
- Contraste entre o vermelho da marca, o metal dos veículos e o azul do céu.
- Textura real de estrada, pneus e equipamento preservada.
- Recortes amplos, sem remover a carga ou alterar a geometria real dos caminhões.
- Tratamento com contraste firme e saturação controlada, evitando aparência de render 3D.

## 8. Responsividade e acessibilidade

- Menu compacto com botão acessível em telas menores.
- CTAs com área mínima de toque de 44 px.
- Navegação por teclado e foco visível em vermelho/amarelo.
- Imagens com `srcset`, dimensões declaradas, WebP e carregamento tardio fora do hero.
- Contraste de texto verificado sobre fundos sólidos ou overlays fortes.
- Movimento horizontal da frota substituído por scroll-snap nativo no mobile.
- Sem formulário ou coleta de dados: o contato ocorre por telefone, WhatsApp e Instagram.

## 9. Critérios de implementação

- HTML semântico, CSS e JavaScript puro.
- GSAP + ScrollTrigger por CDN, com fallback de IntersectionObserver.
- Nenhuma chave, token, credencial ou dado financeiro no código.
- CNAME configurado para `www.guinchomarquizelli.com.br`.
- Imagens brutas e arquivos locais de trabalho ignorados pelo Git.
- Conteúdo limitado ao manual de marca e às informações explícitas do briefing.
