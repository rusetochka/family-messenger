FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY src ./src
COPY public ./public
COPY index.html tsconfig*.json vite.config.ts tailwind.config.js postcss.config.js ./
RUN npm run build
FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY server.mjs ./server.mjs
ENV PORT=8080
USER node
EXPOSE 8080
CMD ["node","server.mjs"]
