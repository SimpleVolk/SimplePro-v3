# SSL Certificate Management

This directory contains SSL certificates and related configuration for SimplePro.

## Development/Testing

For development and testing environments, you can generate self-signed certificates:

```bash
# Make the script executable
chmod +x generate-certs.sh

# Generate certificates
./generate-certs.sh
```

## Production

For production environments, you should:

1. **Use certificates from a trusted Certificate Authority (CA)**
2. **Consider using Let's Encrypt for free SSL certificates**
3. **Implement certificate auto-renewal**

### Let's Encrypt Integration

For production deployment with Let's Encrypt:

```bash
# Install certbot
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# Generate certificate
sudo certbot --nginx -d yourdomain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

### Certificate Files

- `cert.pem` - The SSL certificate
- `key.pem` - The private key
- `fullchain.pem` - Certificate chain (for Let's Encrypt)

## Security Best Practices

1. **Keep private keys secure** - Never commit private keys to version control
2. **Use strong encryption** - Minimum 2048-bit RSA keys
3. **Regular renewal** - Set up automated certificate renewal
4. **Monitor expiration** - Implement alerts for certificate expiration
5. **HSTS headers** - Use HTTP Strict Transport Security headers

## File Permissions

Ensure proper file permissions:

```bash
chmod 600 key.pem      # Private key - read only by owner
chmod 644 cert.pem     # Certificate - readable by all
```

## Testing SSL Configuration

Test your SSL configuration:

```bash
# Test SSL certificate
openssl x509 -in cert.pem -text -noout

# Test SSL connection
openssl s_client -connect localhost:443 -servername localhost

# Online SSL testing (for production)
# https://www.ssllabs.com/ssltest/
```