#!/usr/bin/env bash

cd $(dirname ${BASH_SOURCE[0]})

if [[ $(git status) ]]; then
    echo "Changes found. Pulling changes..."
    git add -A && git commit -m 'update' && git pull
    cp index.html /var/www/html
    service apache2 restart
else
    echo "No changes found. Skip pulling."
fi
