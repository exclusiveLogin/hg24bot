FROM node:12.20.2
COPY . /usr/src/app
WORKDIR /usr/src/app
RUN npm i

RUN npm install pm2 -g
ENV PM2_PUBLIC_KEY xcwluls5rg8erxe
ENV PM2_SECRET_KEY 4wi8450plilxnq8

CMD [ "pm2-runtime", "start", "ecosystem.config.js" ]
