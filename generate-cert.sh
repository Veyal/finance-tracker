#!/bin/bash

# Generates self-signed certificates for local development using Docker
# Usage: ./generate-cert.sh

mkdir -p certs

if [ -f "certs/server.key" ] && [ -f "certs/server.crt" ]; then
    echo "✅ Certificates already exist in ./certs"
    exit 0
fi

echo "🔐 Generating self-signed certificates for localhost..."

# Check if docker is available
if command -v docker >/dev/null 2>&1; then
    docker run --rm -v $(pwd)/certs:/certs alpine/openssl req -x509 -nodes -days 365 \
    -newkey rsa:2048 -keyout /certs/server.key -out /certs/server.crt \
    -subj "/C=US/ST=Dev/L=Local/O=Dev/CN=localhost"
    
    echo "✅ Certificates generated!"
else
    echo "❌ Docker not found. Please install Docker or generate certs manually using openssl."
    exit 1
fi
