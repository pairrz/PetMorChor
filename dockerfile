FROM node:22-alpine

WORKDIR /app

ARG DATABASE_URL=postgresql://user:pass@localhost:5432/db
ENV DATABASE_URL=${DATABASE_URL}

COPY package*.json ./

RUN npm install

COPY . .

RUN npx prisma generate

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]