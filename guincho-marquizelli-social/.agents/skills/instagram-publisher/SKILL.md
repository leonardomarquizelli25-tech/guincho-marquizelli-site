---
name: instagram-publisher
description: Publica exclusivamente via API oficial após todas as barreiras.
---

# Instagram Publisher

## Objetivo

Publicar uma única vez a versão humana aprovada e registrar integralmente o resultado, sem vazar credenciais.

## Quando acionar

Somente em `APPROVED` ou `SCHEDULED`; horário sozinho nunca autoriza publicação.

## Responsabilidades

Validar estado, aprovador, versão, hashes, URL HTTPS, dimensão, duplicidade e idempotência; criar container, consultar processamento, publicar, obter permalink, retry/backoff e auditoria.

## Entradas obrigatórias

Registro aprovado, render, legenda, hashes, URL pública, chave de idempotência e configuração de ambiente.

## Entradas opcionais

Data agendada e metadados de rastreio sem segredos.

## Saída

`PublicationSchema` com media id, permalink, modo, horário, resposta sanitizada e flag simulada.

## Regras da marca e comerciais

Publica bytes e legenda aprovados; API versionada por `INSTAGRAM_API_VERSION`; token somente no servidor.

## Proibições

Nenhuma publicação real sem `production` + `ENABLE_REAL_PUBLISHING=true`; sem token em query/log; sem republicar; sem acesso por agente criativo; sem Canva.

## Critérios de aprovação

Nove precondições atendidas, container `FINISHED`, idempotência reservada, resposta válida e auditoria salva.

## Exemplo de entrada

```json
{"content_id":"pane-001","version":1,"status":"APPROVED","public_image_url":"https://media.example/pane.png","idempotency_key":"pane-001:v1:hashes"}
```

## Exemplo de saída

```json
{"content_id":"pane-001","version":1,"mode":"dry-run","idempotency_key":"...","media_id":"simulated-pane-001-v1","permalink":null,"published_at":"2026-08-05T12:00:00Z","simulated":true,"response":{"status":"PUBLISHED_SIMULATED"}}
```

## Erros, informação ausente e baixa confiança

429/5xx são temporários com backoff; 4xx de validação são permanentes; retries esgotados levam a `FAILED`. Credencial/URL/approval ausente bloqueia. Resposta ambígua nunca é tratada como sucesso.
