FROM node:lts-bullseye-slim

RUN mkdir -p /home/node/app

WORKDIR /home/node/app

COPY package.json /home/node/app

RUN npm install

EXPOSE 7080

CMD [ "./node_modules/.bin/nodemon", "index" ]
