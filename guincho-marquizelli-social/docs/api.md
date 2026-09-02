# API do MVP

Todas as respostas usam JSON. Erros de schema retornam 400; violações de workflow retornam 409; ausências retornam 404.

## Criar briefing

`POST /api/briefings`

```json
{
  "content_id": "pane-001",
  "objective": "Educar sobre sinais de pane",
  "topic": "Sinais de pane automotiva",
  "audience": "motoristas",
  "requested_format": "feed",
  "planned_date": null,
  "notes": "",
  "commercial_data": {}
}
```

## Ações sequenciais

Use os endpoints de strategy, copy, review, visual-direction, assets, render, visual/review e approval/request. Cada ação verifica o estado; chamada fora de ordem é recusada.

## Aprovar

`POST /api/contents/pane-001/approve`

```json
{"approver":"maria","chat_id":"123","comment":"Aprovado"}
```

## Solicitar alteração

`POST /api/contents/pane-001/changes`

```json
{"instruction":"Troque a headline.","requested_by":"maria"}
```

O retorno já terá versão incrementada, snapshot anterior preservado e estado `COPY_DRAFT` ou `VISUAL_DIRECTION`.

## Refazer etapa

`POST /api/contents/pane-001/redo`

```json
{"step":"visual_production","requested_by":"maria"}
```

As etapas aceitas são `copy`, `visual_direction`, `asset_production` e `visual_production`. A ação cria nova versão, invalida o render/aprovação anterior e retorna ao predecessor seguro da etapa solicitada.

## Agendar e publicar

`POST /api/contents/:id/schedule` recebe `scheduled_for` ISO-8601. `POST /publish` exige registro aprovado e recebe `{"target":"feed"}` ou `{"target":"story"}`. Em dry-run o final é `PUBLISHED_SIMULATED`.

## Webhooks

- `/webhooks/telegram`: exige `X-Telegram-Bot-Api-Secret-Token`.
- `/webhooks/meta`: exige `X-Hub-Signature-256` HMAC-SHA256 sobre o body bruto.
