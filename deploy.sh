#!/bin/bash

cd /var/www/ETS---Fullstack

git pull origin main

cd backend

docker compose up -d --build

docker image prune -f

