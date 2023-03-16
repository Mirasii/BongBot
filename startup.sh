#!/bin/bash

# Activate the service account
gcloud auth activate-service-account --key-file="$GOOGLE_APPLICATION_CREDENTIALS"

# Retrieve the secret and set environment variables
export $(gcloud secrets versions access latest --secret=ENVIRONMENT --format=json | jq -r '.payload.data' | base64 -d | tr '\n' ' ')

# Install Node.js if not already installed
if ! command -v node &> /dev/null
then
    sudo apt-get update
    sudo apt-get install -y nodejs
fi

# Install dependencies and start the app
npm ci --only=prod
npm start
