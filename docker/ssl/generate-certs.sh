#!/bin/bash

# SSL Certificate Generation Script for SimplePro
# This script generates self-signed certificates for development/testing
# For production, use certificates from a trusted CA

set -e

CERT_DIR="/etc/nginx/ssl"
DAYS=365
KEY_SIZE=2048

echo "Generating SSL certificates for SimplePro..."

# Create certificate directory if it doesn't exist
mkdir -p "$CERT_DIR"

# Generate private key
openssl genrsa -out "$CERT_DIR/key.pem" $KEY_SIZE

# Generate certificate signing request
openssl req -new -key "$CERT_DIR/key.pem" -out "$CERT_DIR/cert.csr" -subj "/C=US/ST=CA/L=San Francisco/O=SimplePro/OU=IT Department/CN=localhost"

# Generate self-signed certificate
openssl x509 -req -in "$CERT_DIR/cert.csr" -signkey "$CERT_DIR/key.pem" -out "$CERT_DIR/cert.pem" -days $DAYS

# Set proper permissions
chmod 600 "$CERT_DIR/key.pem"
chmod 644 "$CERT_DIR/cert.pem"

# Clean up CSR file
rm "$CERT_DIR/cert.csr"

echo "SSL certificates generated successfully!"
echo "Certificate: $CERT_DIR/cert.pem"
echo "Private Key: $CERT_DIR/key.pem"
echo "Valid for: $DAYS days"

# Display certificate information
echo ""
echo "Certificate Information:"
openssl x509 -in "$CERT_DIR/cert.pem" -text -noout | grep -E "(Subject:|Issuer:|Not Before:|Not After:)"