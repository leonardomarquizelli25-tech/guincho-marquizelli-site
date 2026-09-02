# Arquitetura e limites de confiança

```mermaid
sequenceDiagram
  participant H as Humano/API
  participant O as Orquestrador
  participant C as Agentes criativos
  participant R as Revisores
  participant T as Telegram
  participant I as Instagram Publisher
  participant M as Meta API
  H->>O: Briefing
  O->>C: estratégia/copy/direção/assets
  C-->>O: JSON Zod
  O->>R: copy + render + hashes
  R-->>O: notas/problemas
  O->>T: versão revisada
  T-->>O: decisão humana + hashes
  O->>I: registro aprovado
  I->>I: 9 precondições + idempotência
  I->>M: container/status/media_publish
  M-->>I: media id/permalink
  I-->>O: publicação sanitizada
```

## Limites

- Zona criativa: sem credenciais externas e sem transição autônoma.
- Zona de revisão: somente leitura de outputs, schemas e manual.
- Zona de aprovação: Telegram e banco; sem token Meta.
- Zona de publicação: token Meta, storage e banco; sem geração criativa.
- Assets bloqueados: logo e fotos reais, verificados por hash.

## Portas e adaptadores

`ContentStore`, `AssetProvider`, `ApprovalManager`, `MediaStorage`, `InstagramTransport` e `AnalyticsProvider` isolam infraestrutura. O core não depende de Railway, Render, Fly.io, Vercel, Supabase ou PostgreSQL específico.
