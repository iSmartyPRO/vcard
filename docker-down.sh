#!/bin/sh
docker-compose down
docker image rm nodejs
docker builder prune
rm -rf node_modules
