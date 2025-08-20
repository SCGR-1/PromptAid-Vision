# Admin Authentication Setup

This document explains how to set up admin authentication for the PromptAid Vision application.

## Environment Variables

Add these environment variables to your `.env` file or Hugging Face Space secrets:

### Required Variables

```bash
# Admin password for authentication
ADMIN_PASSWORD=your-secure-admin-password-here

# JWT secret key for token signing (use a strong, random key)
JWT_SECRET_KEY=your-secure-jwt-secret-key-here
```

### Optional Variables

```bash
# Database connection
DATABASE_URL=postgresql://username:password@localhost:5432/database_name

# Storage configuration
STORAGE_PROVIDER=local
STORAGE_DIR=./uploads
```

## How It Works

### 1. Admin Login
- Users click "Admin Login" in the header navigation
- They enter the admin password
- If correct, they receive a JWT token valid for 24 hours

### 2. Authentication Flow
- Frontend stores the JWT token in localStorage
- Token is sent with each admin API request in Authorization header
- Backend verifies token validity and role

### 3. Security Features
- JWT tokens expire after 24 hours
- Tokens are verified on each admin request
- Password is stored in environment variables (not in code)

## API Endpoints

### POST `/api/admin/login`
- **Purpose**: Authenticate admin user
- **Body**: `{"password": "admin_password"}`
- **Response**: `{"token": "jwt_token", "expires_at": "timestamp"}`

### POST `/api/admin/verify`
- **Purpose**: Verify admin token
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `{"valid": true/false, "message": "..."}`

### GET `/api/admin/status`
- **Purpose**: Get admin status (protected endpoint)
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `{"status": "authenticated", "role": "admin", "timestamp": "..."}`

## Development vs Production

### Development
- Default password: `admin123`
- Default JWT secret: `your-secret-key-change-in-production`
- **⚠️ Change these in production!**

### Production
- Use strong, random passwords
- Use secure JWT secret keys
- Store secrets in environment variables or Hugging Face Space secrets
- Consider implementing password hashing for additional security

## Future Enhancements

- User-specific accounts and permissions
- Role-based access control
- Password hashing with bcrypt
- Session management
- Audit logging
- Two-factor authentication

## Troubleshooting

### Common Issues

1. **"Invalid admin password"**
   - Check that `ADMIN_PASSWORD` environment variable is set correctly
   - Ensure no extra spaces or characters

2. **"Token is invalid or expired"**
   - Token may have expired (24-hour limit)
   - Try logging in again
   - Check `JWT_SECRET_KEY` is consistent

3. **"Method Not Allowed"**
   - Ensure admin router is properly included in main.py
   - Check API endpoint URLs are correct

### Debug Steps

1. Verify environment variables are loaded
2. Check backend logs for authentication errors
3. Verify JWT token format in browser localStorage
4. Test API endpoints directly with tools like curl or Postman
