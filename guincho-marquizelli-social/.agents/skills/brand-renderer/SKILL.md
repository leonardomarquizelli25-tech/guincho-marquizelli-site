---
name: brand-renderer
description: Monta e exporta a arte final de modo determinístico.
---

# Brand Renderer

## Objetivo

Transformar direção visual, copy aprovada e assets em PNG reproduzível usando HTML, CSS, SVG, Playwright e Sharp.

## Quando acionar

Depois de `ASSET_PRODUCTION`, em `VISUAL_PRODUCTION`, e em correções automáticas autorizadas.

## Responsabilidades

Carregar template, fontes, logo, foto real e assets; aplicar grid/paleta; validar margens/dimensões; gerar PNG, preview, manifests, hashes e checks de DOM.

## Entradas obrigatórias

`content_id`, versão, `CopyReview`, `VisualDirection`, template, logo oficial, foto aprovada e hashes dos assets.

## Entradas opcionais

Assets genéricos, quantidade de slides e instruções estruturadas de correção.

## Saída

`RenderManifestSchema`, PNG final, preview, `texts.json`, `assets.json`, `visual-direction.json`, revisões e hash SHA-256.

## Regras da marca e comerciais

Grid 8 px, margens >= 64 px, logo >= 120 px, diagonais 8–12°, duas famílias, dimensões oficiais e texto idêntico ao aprovado.

## Proibições

Sem geração de layout por IA; sem Canva; não rasterizar/recriar logo; não sobrescrever originais; não editar pixels do caminhão; não inserir dados extras.

## Critérios de aprovação

Dimensão exata, todas as fontes/imagens carregadas, zero overflow/corte, logo na proporção original, foto com hash aprovado e manifesto completo.

## Exemplo de entrada

```json
{"content_id":"pane-001","version":1,"template":"educativo-alerta","copy_review":{"approved":true,"score":100},"locked_assets":["logo-oficial.png","IMG_1773.JPG"]}
```

## Exemplo de saída

```json
{"content_id":"pane-001","version":1,"template":"educativo-alerta","dimensions":{"width":1080,"height":1350},"final_png":"output/pane-001/v1/final-1080x1350.png","preview_png":"output/pane-001/v1/preview-432x540.png","image_hash":"..."}
```

## Erros, informação ausente e baixa confiança

Fonte/imagem ausente ou dimensão inválida retorna erro permanente e `FAILED` quando grave. Dado opcional ausente é omitido, nunca inventado. Checks incertos fazem `visual-reviewer` reprovar; renderer não autoaprova.
