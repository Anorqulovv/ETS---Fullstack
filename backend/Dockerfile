FROM node:22.12-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

ENV NITRO_PRESET=node-server

RUN npm run build

EXPOSE 3000

CMD ["node",".output/server/index.mjs"]
