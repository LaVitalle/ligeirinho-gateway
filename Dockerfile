# API Gateway — reverse proxy enxuto (Express + http-proxy-middleware)
FROM node:22-alpine

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 4000

CMD ["npm", "run", "start:prod"]
