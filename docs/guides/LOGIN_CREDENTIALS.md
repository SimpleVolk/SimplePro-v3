# SimplePro-v3 Default Admin Credentials

## Default Admin User

The system automatically creates a default admin user when the API starts up for the first time.

### Login Credentials (Development Environment)

- **Username**: `admin`
- **Email**: `admin@simplepro.com` (can also be used as username)
- **Password**: `Admin123!`

### Authentication Details

- Both username and email can be used as the login identifier
- The password is case-sensitive and includes special characters
- Default role: Super Administrator with all permissions
- Account is active by default and does not require password change in development

### API Endpoints

- **Login**: `POST /api/auth/login`
- **Health Check**: `GET /api/health`
- **API Documentation**: `GET /api/docs` (Swagger UI)

### Example Login Request

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "Admin123!"}'
```

### Security Notes

- In production environments, the password is randomly generated and stored securely
- Development uses a fixed password for easier testing
- The admin user cannot be deleted (only deactivated)
- Sessions use JWT tokens with 1-hour access tokens and 7-day refresh tokens

## Troubleshooting

If login fails:
1. Verify the password is exactly `Admin123!` (case-sensitive with exclamation mark)
2. Check that the API is running on the correct port (default: 3001)
3. Ensure MongoDB is connected (check health endpoint)
4. Try using either username or email as the login identifier

## Database Information

- The admin user is automatically created on first API startup
- User data is stored in MongoDB in the `users` collection
- Database connection details are configured via environment variables