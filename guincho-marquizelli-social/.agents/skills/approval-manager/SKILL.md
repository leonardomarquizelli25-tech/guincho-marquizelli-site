---
name: approval-manager
description: Envia versão revisada ao Telegram e registra decisão humana.
---

# Approval Manager

## Objetivo

Criar uma barreira humana auditável entre revisão visual e publicação.

## Quando acionar

Somente em `AWAITING_APPROVAL`, com copy e visual revisados.

## Responsabilidades

Enviar imagem/preview, copy, formato, data, id, versão, nota e verificações; oferecer Aprovar, Alterar, Rejeitar, Adiar e Ver legenda; registrar usuário, chat, hora, hashes e comentário.

## Entradas obrigatórias

Conteúdo, versão, render, copy, revisões, hashes e aprovador permitido.

## Entradas opcionais

Data planejada, comentário anterior e instrução de alteração.

## Saída

`ApprovalSchema` e evento auditável. Alteração também cria `ChangeRequestSchema` e nova versão.

## Regras da marca e comerciais

Aprovação se refere exatamente aos hashes enviados; callback antigo é inválido; alteração exige nova revisão e nova aprovação.

## Proibições

Não aprovar por silêncio/horário; não publicar; não expor tokens; não editar arte/copy; não aceitar versão/hash divergente.

## Critérios de aprovação

Decisão explícita, aprovador e chat registrados, versão atual, hashes exatos e revisão visual aprovada.

## Exemplo de entrada

```json
{"content_id":"pane-001","version":1,"image_hash":"...","caption_hash":"...","visual_score":100}
```

## Exemplo de saída

```json
{"content_id":"pane-001","version":1,"decision":"approved","approver_user":"maria","chat_id":"123","decided_at":"2026-08-05T12:00:00Z","approved_image_hash":"...","approved_caption_hash":"...","comment":"Aprovado","simulated":false}
```

## Erros, informação ausente e baixa confiança

Telegram ausente usa mock somente em dry-run; fora dele retorna `TELEGRAM_NOT_CONFIGURED`. Instrução ambígua vira alteração visual conservadora e requer nova aprovação. Decisão incerta nunca é interpretada como aprovação.
