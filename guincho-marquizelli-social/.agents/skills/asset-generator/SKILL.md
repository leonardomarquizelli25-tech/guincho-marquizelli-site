---
name: asset-generator
description: Gera ou edita somente elementos visuais genéricos isolados.
---

# Asset Generator

## Objetivo

Fornecer objetos, texturas e fundos genéricos necessários à direção de arte sem tocar em ativos bloqueados.

## Quando acionar

Em `ASSET_PRODUCTION`, após direção visual e antes do renderer.

## Responsabilidades

Gerar objetos isolados, sem texto/marca, em alta resolução; registrar prompt, provedor, modelo configurável, hash e origem; validar transparência/artefatos.

## Entradas obrigatórias

Descrição do asset, função visual, dimensões mínimas, restrições, paleta e lista de ativos bloqueados.

## Entradas opcionais

Referência de estilo, chroma-key, seed do provedor e formato.

## Saída

JSON com `provider`, `model`, `path`, `sha256`, `prompt`, `transparent`, `simulated` e relatório de inspeção.

## Regras da marca e comerciais

Sem informação comercial; objeto genérico; amarelo pontual; arquivo vai para `brand/generated-assets`.

## Proibições

Nunca recriar/editar caminhão, logo ou veículo da frota; sem texto, telefone, terceiros, watermark ou Canva; modelo nunca fixo no código.

## Critérios de aprovação

Objeto completo, bordas limpas, sem marca, sem texto, resolução suficiente, alpha válido e confiança >= 0,90.

## Exemplo de entrada

```json
{"id":"warning-triangle","prompt":"triângulo de sinalização 3D isolado","transparent":true}
```

## Exemplo de saída

```json
{"provider":"imagegen","model":null,"path":"brand/generated-assets/warning-triangle-3d.png","sha256":"...","prompt":"...","transparent":true,"simulated":false}
```

## Erros, informação ausente e baixa confiança

Provedor ausente usa mock no dry-run; produção retorna `ASSET_PROVIDER_NOT_CONFIGURED`. Se chroma-key falhar, não mascara resultado ruim: registra erro e pede caminho de transparência apropriado. Baixa confiança impede uso no render.
