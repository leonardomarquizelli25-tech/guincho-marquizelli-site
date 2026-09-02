#!/usr/bin/env sh
set -eu
command -v node >/dev/null 2>&1 || { echo "Node.js 20+ não encontrado" >&2; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "npm não encontrado" >&2; exit 1; }
npm install
npm run typecheck
npm test
echo "Instalação concluída. Execute: npm run workflow:dry-run"
