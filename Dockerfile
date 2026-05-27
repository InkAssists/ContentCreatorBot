FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY src/ ./src/
COPY tsconfig.json ./

RUN npm run build \
    && npm prune --omit=dev \
    && mkdir -p data

EXPOSE 8080

CMD ["node", "dist/index.js"]
