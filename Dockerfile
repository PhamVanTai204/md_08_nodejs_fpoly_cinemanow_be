FROM node:20

WORKDIR /app

COPY package*.json ./

RUN npm install --omit=optional

COPY . .

EXPOSE 3000

CMD ["npm", "run", "start"]
