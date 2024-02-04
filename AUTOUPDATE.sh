#!/usr/bin/env bash

cd $(dirname ${BASH_SOURCE[0]})

if [[ -n $(git status -s) ]]; then
    echo "Changes found. Pulling changes..."
    git add -A && git commit -m 'update' && git pull --rebase
    cp index.html /var/www/html
    service apache2 restart
else
    echo "No changes found. Skip pulling."
fi
