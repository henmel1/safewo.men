#!/usr/bin/env bash

cd $(dirname ${BASH_SOURCE[0]})
git add -A
git commit -m 'update'
git pull

