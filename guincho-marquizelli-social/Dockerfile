FROM mcr.microsoft.com/playwright:v1.62.1-noble AS base
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN corepack enable && corepack prepare pnpm@10.13.1 --activate && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
ENV APP_ENV=dry-run ENABLE_REAL_PUBLISHING=false APPROVAL_REQUIRED=true
EXPOSE 3000
CMD ["node", "dist/src/api/server.js"]
