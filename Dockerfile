# =============================================================================
# Multi-stage build — NestJS + Prisma
# Stage 1: Compila TypeScript
# Stage 2: Imagem de produção mínima
# =============================================================================

FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl

# Instala dependências (incluindo devDeps para compilar)
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci

# Gera o Prisma Client
RUN npx prisma generate

# Compila o TypeScript
COPY tsconfig*.json nest-cli.json ./
COPY src ./src/
RUN npm run build

# =============================================================================

FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl

# Apenas dependências de produção
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --omit=dev

# Gera o Prisma Client
RUN npx prisma generate

# Código compilado
COPY --from=builder /app/dist ./dist

EXPOSE 3000

# migrate deploy garante que o banco está atualizado antes de iniciar
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
