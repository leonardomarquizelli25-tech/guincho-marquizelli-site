# AGENTS.md — Guincho Marquizelli Social

## Escopo e autoridade

Este arquivo governa todo o projeto. O orquestrador central é a única autoridade para mudar estados. Agentes especializados produzem artefatos; não escolhem livremente o próximo agente e nunca publicam diretamente. Toda mensagem entre agentes deve ser JSON validado por Zod e conter `content_id`, `version`, `producer`, `schema_version`, `confidence`, `payload` e `warnings`.

## Ordem obrigatória

1. `content-strategist`
2. `copywriter`
3. `copy-reviewer`
4. `art-director`
5. `asset-generator`
6. `brand-renderer`
7. `visual-reviewer`
8. correção automática, se necessária, voltando somente à etapa indicada
9. `approval-manager`
10. `instagram-publisher`
11. `content-analytics`

É proibido pular revisão da copy, revisão visual ou aprovação humana. Mudança posterior à aprovação cria nova versão e invalida os hashes aprovados.

## Ferramentas permitidas e proibidas

| Agente | Permitidas | Proibidas |
| --- | --- | --- |
| content-strategist | leitura de briefing, calendário, histórico e `brand.json`; provedor de texto | renderer, Telegram, tokens Meta, publicação |
| copywriter | estratégia aprovada, provedor de texto, schemas | fotos originais, renderer, Telegram, Instagram |
| copy-reviewer | copy, `brand.json`, regras lexicais e provedor de texto | editar assets, aprovar visual, publicar |
| art-director | copy aprovada, inventário, referências somente para linguagem visual | copiar referência, editar caminhão/logo, publicar |
| asset-generator | provedor de imagem configurável, Sharp para recorte de elementos genéricos | caminhões reais, logo, texto comercial, Canva |
| brand-renderer | HTML, CSS, SVG, Playwright, Sharp, fontes, logo e fotos aprovadas | geração de layout por IA, edição generativa da frota, Canva, publicação |
| visual-reviewer | visão configurável, Sharp, manifesto, hashes e checks de DOM | alterar assets bloqueados, aprovar humanamente, publicar |
| approval-manager | Telegram Bot API, banco, armazenamento de preview | alterar copy/arte, token Meta, publicar |
| instagram-publisher | Instagram Graph API, storage público temporário, banco e fila | OpenAI, edição criativa, Canva, ignorar aprovação |
| content-analytics | endpoints de insights, banco | mudar conteúdo publicado, republicar |

Canva, Canva API, Canva MCP, templates ou exportações do Canva são proibidos sem exceção.

## Estado e repetição

As transições válidas estão em `src/orchestrator/state-machine.ts`. Uma etapa repete somente quando seu revisor fornece `required_changes` estruturadas. A correção automática visual é limitada a `MAX_AUTOMATIC_REVISIONS`, nunca superior a 2. Depois do limite, a automação envia preview e problemas para revisão humana e bloqueia a aprovação/publicação enquanto houver erro grave.

Copy avança apenas com nota >= 90, nenhum problema alto, nenhum dado comercial sem confirmação e nenhuma oferta mecânica. Visual avança automaticamente apenas com nota >= 90, nenhum problema alto, logo sem deformação, caminhão preservado e texto exato.

## Publicação

Somente `instagram-publisher` pode acessar `META_ACCESS_TOKEN`. Antes de publicar deve validar: estado APPROVED/SCHEDULED; aprovador; versão; hashes de imagem e legenda; URL HTTPS pública; dimensões; inexistência de publicação; idempotência inédita. O padrão é `dry-run`; produção exige `APP_ENV=production`, `ENABLE_REAL_PUBLISHING=true`, credenciais e aprovação humana. Conteúdo rejeitado, alterado, já publicado ou sem aprovação nunca é publicado.

## Preservação de ativos

Arquivos em `brand/trucks/originals`, `brand/trucks/approved` e `brand/logos` são camadas bloqueadas. O original nunca é sobrescrito. Não recriar, substituir ou alterar modelo, rodas, cabine, plataforma, adesivos, placa, equipamentos ou cores do caminhão. Processamentos permitidos geram arquivo separado e limitam-se a exposição, contraste, balanço de branco, nitidez moderada, recorte, remoção de fundo não generativa e sombra externa separada. Logo nunca é redesenhada, digitada, distorcida ou recebe efeitos.

## Regras comerciais e da marca

Grafar sempre “Guincho Marquizelli” ou “Marquizelli”. A empresa presta apenas os serviços confirmados em `brand/brand.json`: reboque e transporte de veículos. Conteúdo mecânico é educativo; não diagnostica, conserta ou oferece oficina. Telefone, WhatsApp, área, horários, preço, pagamento e modalidades específicas só podem aparecer se preenchidos no arquivo da marca. Ausência implica `null`, `requires_confirmation` ou bloqueio.

Referências visuais fornecem hierarquia, composição e linguagem, nunca pixels, logos, nomes, telefones, veículos, marcas, textos ou watermarks. Toda transição, revisão, aprovação, mudança e tentativa de publicação gera auditoria. Logs nunca contêm segredos.
