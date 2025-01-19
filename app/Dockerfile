FROM node:22.13

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . ./

EXPOSE 4200

RUN chmod 0700 entrypoint.sh
ENTRYPOINT ["./entrypoint.sh"]
