# Refactoring Documentation - LMI-3

This document outlines the refactoring changes made to improve code organization, maintainability, and reduce redundancy.

## Overview

The refactoring focused on:
1. Adapting the application for the `popa-stefan.be/lmi3` network environment
2. Extracting redundant code into reusable components
3. Improving code organization and structure
4. Removing unnecessary files

## Network Configuration Changes

### Frontend Configuration
- **File**: `frontend/src/config.ts`
- **Changes**: 
  - Updated default API_URL fallback to use `localhost:4000` for development
  - Added comments explaining the production setup via Traefik
  - API URL in production: `https://popa-stefan.be/lmi3/api`

### CORS Configuration
- **File**: `backend/middleware/cors.js`
- **Changes**:
  - Added `https://popa-stefan.be/lmi3` and `https://www.popa-stefan.be/lmi3` to allowed origins
  - Now supports sub-path routing for the /lmi3 prefix

### Docker Compose
- **File**: `docker-compose.yml`
- **Changes**:
  - Updated service name from `frontend` to `frontend_lmi3` for consistency
  - Added `NEXT_PUBLIC_BUILD_ID` environment variable
  - Updated Traefik labels to match service naming

## Backend Refactoring

### New Utility Files

#### 1. API Response Utilities (`backend/utils/apiResponse.js`)
Standardizes API responses across the application with helper functions:
- `success()` - Send successful responses
- `error()` - Send error responses
- `validationError()` - Send validation errors
- `notFound()` - Send 404 responses
- `unauthorized()` - Send 401 responses
- `forbidden()` - Send 403 responses

**Usage Example**:
```javascript
const { success, error, notFound } = require('./utils/apiResponse');

// Instead of:
res.status(200).json({ message: "Success", data: user });

// Use:
success(res, user, "User retrieved successfully");
```

#### 2. Validation Utilities (`backend/utils/validation.js`)
Consolidates all input validation and sanitization logic:
- `sanitizeInput()` - Sanitize general text
- `sanitizeEmail()` - Sanitize and normalize emails
- `sanitizePhone()` - Sanitize phone numbers
- `isValidEmail()` - Validate email format
- `isValidName()` - Validate name format
- `validatePassword()` - Validate password strength
- `validateRequiredFields()` - Validate required fields
- `validateAndParseDate()` - Validate and parse dates
- `sanitizeObject()` - Sanitize multiple fields at once

**Usage Example**:
```javascript
const { sanitizeEmail, isValidEmail, validatePassword } = require('./utils/validation');

const email = sanitizeEmail(req.body.email);
if (!isValidEmail(email)) {
  return validationError(res, "Invalid email format");
}
```

### Improved Server Initialization
- **File**: `backend/index.js`
- **Changes**:
  - Better error handling on startup
  - Enhanced logging with emojis for better readability
  - Displays all available endpoints on startup
  - Proper async/await pattern

## Frontend Refactoring

### New Service Layer

#### 1. HTTP Client (`frontend/src/services/httpClient.ts`)
Centralized HTTP client for all API requests:
- Handles authentication automatically
- Standardized error handling
- Supports all HTTP methods (GET, POST, PUT, PATCH, DELETE)
- File upload support
- Automatic token refresh on auth errors

**Usage Example**:
```typescript
import { httpClient } from '@/services/httpClient';

// Instead of manually handling fetch:
const data = await httpClient.get<User[]>('/admin/users');
```

#### 2. Base Service (`frontend/src/services/BaseService.ts`)
Abstract base class for all service classes:
- Provides common CRUD operations
- Reduces boilerplate code
- Consistent API across services

**Usage Example**:
```typescript
import { BaseService } from './BaseService';

class UserService extends BaseService {
  constructor() {
    super('/admin/users');
  }

  // Use inherited methods:
  // - getAll<T>()
  // - getById<T>(id)
  // - create<T>(data)
  // - update<T>(id, data)
  // - delete<T>(id)
}
```

### Common UI Components

#### 1. Form Inputs (`frontend/src/components/common/FormInputs.tsx`)
Reusable form input components with consistent styling:
- `FormInput` - General text input
- `FormEmailInput` - Email input
- `FormPasswordInput` - Password input
- `FormPhoneInput` - Phone input

#### 2. Feedback Components (`frontend/src/components/common/FeedbackComponents.tsx`)
Common UI feedback components:
- `Loading` - Loading spinner with message
- `ErrorDisplay` - Error display with retry option
- `EmptyState` - Empty state placeholder

**Usage Example**:
```typescript
import { Loading, ErrorDisplay } from '@/components/common';

if (loading) return <Loading message="Loading users..." />;
if (error) return <ErrorDisplay error={error} onRetry={fetchData} />;
```

## File Cleanup

### Removed Files
- `backend/index_old.js` - Old server implementation (replaced by app.js)
- `backend/simple-server.js` - Unused simple server file

### File Organization

#### Backend Structure
```
backend/
├── app.js              # Main application setup
├── index.js            # Server entry point
├── config/             # Configuration modules
│   ├── database.js
│   ├── logger.js
│   ├── minio.js
│   └── redis.js
├── middleware/         # Express middleware
│   ├── auth.js
│   ├── cors.js
│   └── validation.js
├── routes/             # API route handlers
├── utils/              # Utility functions
│   ├── apiResponse.js  # NEW: API response helpers
│   ├── validation.js   # NEW: Validation utilities
│   └── helpers.js      # General helpers
└── prisma/             # Database schema and migrations
```

#### Frontend Structure
```
frontend/src/
├── app/                # Next.js pages
├── components/
│   ├── common/         # NEW: Reusable components
│   │   ├── FormInputs.tsx
│   │   ├── FeedbackComponents.tsx
│   │   └── index.ts
│   ├── ui/             # UI components
│   ├── auth/           # Auth components
│   ├── layout/         # Layout components
│   └── grid/           # Grid components
├── services/           # API services
│   ├── httpClient.ts   # NEW: HTTP client
│   ├── BaseService.ts  # NEW: Base service class
│   ├── authService.ts
│   ├── attendanceService.ts
│   └── ...
├── theme/              # Theme configuration
├── types/              # TypeScript types
└── utils/              # Utility functions
```

## Migration Guide

### For Backend Developers

1. **Use new response helpers**:
   ```javascript
   // Old way
   res.status(200).json({ message: "Success", user });
   
   // New way
   const { success } = require('./utils/apiResponse');
   success(res, user, "User retrieved successfully");
   ```

2. **Use validation utilities**:
   ```javascript
   // Old way
   const email = req.body.email.trim();
   
   // New way
   const { sanitizeEmail } = require('./utils/validation');
   const email = sanitizeEmail(req.body.email);
   ```

### For Frontend Developers

1. **Use httpClient for API calls**:
   ```typescript
   // Old way
   const response = await fetch(`${API_URL}/users`, {
     headers: { Authorization: `Bearer ${token}` }
   });
   const data = await response.json();
   
   // New way
   import { httpClient } from '@/services/httpClient';
   const data = await httpClient.get<User[]>('/users');
   ```

2. **Extend BaseService for new services**:
   ```typescript
   import { BaseService } from './BaseService';
   
   class MyService extends BaseService {
     constructor() {
       super('/api/my-resource');
     }
     
     // Custom methods here
   }
   ```

3. **Use common components**:
   ```typescript
   import { Loading, ErrorDisplay, FormInput } from '@/components/common';
   ```

## Testing Considerations

- Test all API endpoints with the new `/lmi3/api` prefix
- Verify CORS works correctly from `https://popa-stefan.be/lmi3`
- Test authentication flow with new httpClient
- Ensure error handling works across all services

## Future Improvements

1. **Backend**:
   - Create service layer to separate business logic from routes
   - Add request validation middleware using validation utilities
   - Implement comprehensive logging strategy
   - Add API documentation (Swagger/OpenAPI)

2. **Frontend**:
   - Convert remaining services to use BaseService
   - Create more common UI components (tables, modals, etc.)
   - Implement global error boundary
   - Add client-side request caching

3. **General**:
   - Add comprehensive test suite
   - Implement CI/CD pipeline
   - Add monitoring and alerting
   - Document API endpoints

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Express Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Traefik Documentation](https://doc.traefik.io/traefik/)
