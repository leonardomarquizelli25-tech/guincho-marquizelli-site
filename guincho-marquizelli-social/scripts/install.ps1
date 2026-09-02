$ErrorActionPreference = 'Stop'
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js 20+ não encontrado.' }
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { throw 'npm não encontrado.' }
npm install
npm run typecheck
npm test
Write-Output 'Instalação concluída. Execute: npm run workflow:dry-run'
