# Segurança e publicação

O site institucional é publicado pelo workflow `Publish public website`, com uma lista explícita de arquivos. O diretório do agente social nunca entra no artefato de hospedagem.

## Agente social

Na pasta `guincho-marquizelli-social`, execute `node scripts/setup-env.mjs` uma vez antes do primeiro uso. Ele gera chaves aleatórias no `.env`, sem mostrá-las, e não sobrescreve um arquivo existente. Guarde o arquivo apenas no ambiente privado. A API exige `PUBLISHER_API_KEY` inclusive em dry-run.

O servidor local escuta em `127.0.0.1`. O Compose publica somente a API em loopback, mantém o PostgreSQL na rede interna e exige senha fornecida por `POSTGRES_PASSWORD`. Para um volume de banco já inicializado, altere também a senha do usuário no próprio banco antes de trocar o cliente; a variável não redefine a senha do volume existente.

O contexto Docker exclui `.env`, chaves, estado e saída. O contêiner usa usuário sem privilégios. Se uma imagem anterior foi distribuída com um `.env` real, revogue as credenciais afetadas e remova a imagem antiga do registro.

Os registros de aprovação e manifestos permanecem em `output`, sem rota pública. Somente JPEGs finais em `public-media` são servidos por `/media/<hash>-feed.jpg` ou `/media/<hash>-story.jpg`. Ao configurar `PUBLIC_MEDIA_BASE_URL`, use a origem HTTPS seguida de `/media/`. URLs públicas de imagens devem ser consideradas compartilháveis; não coloque nelas documentos privados.

Novos identificadores aceitam apenas letras minúsculas, números e hífens, de 3 a 80 caracteres. Identificadores antigos fora desse formato precisam ser migrados antes de reutilizar o conteúdo.

Execute `pnpm typecheck`, `pnpm test` e `pnpm audit` antes de publicar. A integração contínua executa os mesmos controles e procura segredos no histórico com Gitleaks, sem exibir valores.
