FROM node:10-alpine

#  add libraries; sudo so non-root user added downstream can get sudo
RUN apk add --no-cache \
sudo \
curl \
build-base \
g++ \
libpng \
libpng-dev \
jpeg-dev \
pango-dev \
cairo-dev \
giflib-dev \
python

#  add glibc and install canvas
RUN apk --no-cache add ca-certificates wget  && \
    wget -q -O /etc/apk/keys/sgerrand.rsa.pub https://alpine-pkgs.sgerrand.com/sgerrand.rsa.pub && \
    wget https://github.com/sgerrand/alpine-pkg-glibc/releases/download/2.29-r0/glibc-2.29-r0.apk && \
    apk add glibc-2.29-r0.apk && \
    npm install canvas@2.5.0

RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app

WORKDIR /home/node/app

COPY package*.json ./

USER node

RUN npm install

COPY --chown=node:node . .

EXPOSE 7080

CMD [ "node", "index.js" ]
