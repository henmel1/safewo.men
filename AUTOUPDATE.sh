#!/usr/bin/env bash

cd $(dirname ${BASH_SOURCE[0]})
git add -A
git commit -m 'update'
git pull
cp -a /home/henrymellor04/.git/safewo.men/. /var/www/html
