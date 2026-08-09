FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production=false

COPY . .

RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production && npm cache clean --force

COPY --from=builder /app/dist ./dist

EXPOSE 7001

CMD ["node", "dist/main"]
