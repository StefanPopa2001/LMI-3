FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npx prisma db oush

RUN npx prisma generate

EXPOSE 4000

CMD ["npm", "start"]
