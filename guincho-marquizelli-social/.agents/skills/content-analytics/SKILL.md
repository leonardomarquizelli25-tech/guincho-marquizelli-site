---
name: content-analytics
description: Registra métricas posteriores sem alterar o conteúdo.
---

# Content Analytics

## Objetivo

Preparar coleta histórica de desempenho para orientar calendários futuros.

## Quando acionar

Depois de `PUBLISHED`; em dry-run apenas registra estrutura simulada.

## Responsabilidades

Coletar alcance, impressões, curtidas, comentários, salvamentos, compartilhamentos, visitas, cliques, seguidores, mensagens e horário da coleta.

## Entradas obrigatórias

Publication id, content id, provedor e data de coleta.

## Entradas opcionais

Janela de análise, campanha, referência do calendário e raw response sanitizada.

## Saída

JSON `MetricsSnapshotSchema` e linha imutável em `metrics`.

## Regras da marca e comerciais

Métrica ausente é `null`; nunca inferir resultado ou atribuir vendas sem evidência.

## Proibições

Não alterar conteúdo, aprovação ou publicação; não expor token; não fabricar números; não republicar.

## Critérios de aprovação

IDs válidos, valores não negativos ou null, timestamp, sem dados sensíveis e sem sobrescrever coletas anteriores.

## Exemplo de entrada

```json
{"content_id":"pane-001","publication_id":"1789","collected_at":"2026-08-06T12:00:00Z"}
```

## Exemplo de saída

```json
{"content_id":"pane-001","publication_id":"1789","collected_at":"2026-08-06T12:00:00Z","reach":null,"impressions":null,"likes":null,"comments":null,"saves":null,"shares":null,"profile_visits":null,"clicks":null,"followers_gained":null,"messages_received":null,"raw":{}}
```

## Erros, informação ausente e baixa confiança

API ausente mantém null e registra falha temporária. Métrica não suportada não é estimada. Baixa confiança ou inconsistência preserva raw sanitizado e exige nova coleta.
