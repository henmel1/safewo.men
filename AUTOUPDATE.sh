#!/usr/bin/env bash

cd $(dirname ${BASH_SOURCE[0]})

if [[ -n $(git status --porcelain) ]]; then
    echo "Changes found. Pulling changes..."
    git add -A && git commit -m 'update' && git fetch
    cp index.html /var/www/html
    service apache2 restart
else
    echo "No changes found. Skip pulling."
fi
