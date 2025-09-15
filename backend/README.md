# User Management API

This API provides comprehensive user management functionality with secure authentication and authorization.

## Features

- Secure user authentication with JWT tokens
- Password hashing with salt
- Rate limiting for brute force protection
- Admin-only user management endpoints
- Temporary password system for first-time login
- Password validation and security rules
- Input sanitization and validation

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up your environment variables by copying `.env.example` to `.env` and updating the values:
```bash
cp .env.example .env
```

3. Set up your database using Prisma:
```bash
npx prisma db push
```

4. Start the server:
```bash
npm run dev
```

## API Endpoints

### Authentication Endpoints

#### Get User Salt
```
POST /users/getSalt
```
Get the salt for a user's password hashing (required for secure login).

**Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "salt": "user_salt_value"
}
```

#### User Login
```
POST /users/login
```
Authenticate a user and get a JWT token.

**Body:**
```json
{
  "email": "user@example.com",
  "password": "hashed_password_with_salt"
}
```

**Response:**
```json
{
  "token": "jwt_token",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "nom": "Doe",
    "prenom": "John",
    "admin": false,
    "mdpTemporaire": true
  },
  "requirePasswordChange": true,
  "message": "You must change your password before continuing"
}
```

#### Change Password
```
POST /users/changePassword
```
Change user password (required for first-time login or user-initiated change).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Body:**
```json
{
  "currentPassword": "current_hashed_password", // Optional for temporary passwords
  "newPassword": "new_hashed_password",
  "salt": "new_salt_value"
}
```

### User Profile Endpoints

#### Get User Profile
```
GET /users/profile
```
Get the current user's profile information.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

#### Update User Profile
```
PUT /users/profile
```
Update the current user's profile (limited fields).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Body:**
```json
{
  "nom": "Updated Name",
  "prenom": "Updated First Name",
  "GSM": "+1234567890",
  "titre": "Mr.",
  "fonction": "Developer"
}
```

### Admin-Only Endpoints

All admin endpoints require the `Authorization: Bearer <jwt_token>` header and admin privileges.

#### Create User
```
POST /admin/users
```
Create a new user account (admin only).

**Body:**
```json
{
  "email": "newuser@example.com",
  "GSM": "+1234567890",
  "mdp": "hashed_password",
  "sel": "salt_value",
  "titre": "Mr.",
  "fonction": "Employee",
  "nom": "Doe",
  "prenom": "Jane",
  "admin": false,
  "niveau": 1
}
```

#### Get All Users
```
GET /admin/users
```
Get all users in the system (admin only).

#### Update User
```
PUT /admin/users/:id
```
Update any user's information (admin only).

**Body:**
```json
{
  "nom": "Updated Name",
  "prenom": "Updated First Name",
  "admin": true,
  "niveau": 2
}
```

#### Reset User Password
```
POST /admin/users/:id/resetPassword
```
Reset a user's password (admin only). This sets `mdpTemporaire` to true.

**Body:**
```json
{
  "newPassword": "new_hashed_password",
  "salt": "new_salt_value"
}
```

#### Activate User
```
PUT /admin/users/:id/activate
```
Activate a deactivated user account (admin only).

#### Deactivate User
```
PUT /admin/users/:id/deactivate
```
Deactivate a user account (soft delete - admin only).

## Password Security

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- No repeated characters (more than 2 in a row)
- No common weak patterns (123456, password, qwerty, admin)

### Password Flow
1. **Admin creates user**: `mdpTemporaire` is set to `true`
2. **User first login**: Must change password, `mdpTemporaire` becomes `false`
3. **Admin resets password**: `mdpTemporaire` is set to `true` again
4. **User next login**: Must change password again

## Rate Limiting

Authentication endpoints are rate-limited to prevent brute force attacks:
- Maximum 5 requests per 15 minutes per IP
- Applies to `/users/getSalt` and `/users/login`

## Error Responses

All endpoints return appropriate HTTP status codes:
- `200`: Success
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (invalid credentials)
- `403`: Forbidden (insufficient privileges)
- `404`: Not Found
- `429`: Too Many Requests (rate limit exceeded)
- `500`: Internal Server Error

Example error response:
```json
{
  "error": "Password must be at least 8 characters long"
}
```

## Security Features

- JWT token authentication
- Password salting and hashing
- Input sanitization and validation
- Rate limiting for authentication endpoints
- Admin privilege checking
- Temporary password system
- SQL injection prevention
- XSS protection through input sanitization

## Database Schema

The API uses the following User model fields:
- `id`: Auto-increment primary key
- `email`: User's email address
- `GSM`: Phone number
- `mdp`: Hashed password
- `sel`: Password salt
- `admin`: Admin flag
- `actif`: Active status
- `mdpTemporaire`: Temporary password flag
- `titre`: Title (Mr., Mrs., etc.)
- `fonction`: Job function
- `nom`: Last name
- `prenom`: First name
- `niveau`: User level (0-5)
- `revenuQ1`, `revenuQ2`: Revenue tracking
- `entreeFonction`: Date of joining
