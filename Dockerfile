FROM node:22-alpine

WORKDIR /app

COPY package.json ./
COPY server ./server
COPY scripts ./scripts
COPY public ./public
COPY data/seed.json ./data/seed.json

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "server/index.mjs"]
