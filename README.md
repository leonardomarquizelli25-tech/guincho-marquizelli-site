# Site Guincho Marquizelli

Site institucional estático, desenvolvido em HTML, CSS e JavaScript puro para publicação no GitHub Pages.

## Conteúdo

- Serviços para carros, caminhões e tratores.
- Área de atuação na região de Marília.
- Contatos: `(14) 99703-6966` e `(14) 99904-1010`.
- Pagamento por Pix, dinheiro, débito ou crédito à vista/parcelado com juros.
- Instagram: `@guinchomarquizelli`; Facebook: `Guincho Marquizelli`.
- Identidade visual baseada no manual oficial da marca.

O documento mestre institucional não estava disponível no workspace durante a implementação. Os textos publicados foram limitados ao manual de marca e às informações confirmadas no briefing.

## Estrutura

```text
assets/
  fonts/       Fontes oficiais em WOFF2
  images/      Logo e imagens WebP otimizadas
index.html     Página principal
styles.css     Sistema visual responsivo
script.js      Navegação e animações GSAP/ScrollTrigger
CNAME          Domínio customizado do GitHub Pages
```

## Execução local

Sirva a pasta com qualquer servidor HTTP estático. Exemplo:

```bash
python -m http.server 8080
```

Abra `http://localhost:8080`.

## Publicação

O GitHub Pages deve usar a branch `main` e a pasta raiz `/`. O arquivo `CNAME` aponta para:

```text
www.guinchomarquizelli.com.br
```

Após configurar os registros DNS, habilite **Enforce HTTPS** nas configurações do GitHub Pages.

## Segurança

O site não possui backend, formulário ou chave de API. Os contatos abrem links diretos para telefone, WhatsApp e redes sociais. Arquivos de ambiente, chaves e fontes brutas de trabalho são bloqueados pelo `.gitignore`.
