# ── Stage 1: build ──────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

# Copia manifesto primeiro para cache do npm install
COPY package.json package-lock.json ./
RUN npm install --no-audit --no-fund

# Copia o restante e builda em modo produção
COPY . .
RUN npm run build -- --configuration production

# ── Stage 2: serve com nginx ──────────────────────────────────────────────────
FROM nginx:1.27-alpine
WORKDIR /usr/share/nginx/html

# Remove config padrão do nginx
RUN rm /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist/formflow-web/browser ./
COPY nginx.conf /etc/nginx/conf.d/formflow.conf

EXPOSE 80
