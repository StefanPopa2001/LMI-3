# Quick Migration Guide - LMI-3 Refactoring

This guide helps developers quickly adapt to the new refactored codebase.

## For Backend Developers

### Using New Response Helpers

**Before:**
```javascript
app.get('/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.status(200).json({ message: "Success", data: users });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});
```

**After:**
```javascript
const { success, error } = require('./utils/apiResponse');

app.get('/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    success(res, users, "Users retrieved successfully");
  } catch (err) {
    error(res, "Failed to fetch users");
  }
});
```

### Using Validation Utilities

**Before:**
```javascript
app.post('/users', async (req, res) => {
  const email = req.body.email?.trim();
  const name = req.body.name?.trim();
  
  if (!email || !name) {
    return res.status(400).json({ error: "Email and name required" });
  }
  
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "Invalid email" });
  }
  
  // Create user...
});
```

**After:**
```javascript
const { validateRequiredFields, sanitizeEmail, isValidEmail } = require('./utils/validation');
const { success, validationError } = require('./utils/apiResponse');

app.post('/users', async (req, res) => {
  // Validate required fields
  const validation = validateRequiredFields(req.body, ['email', 'name']);
  if (!validation.valid) {
    return validationError(res, `Missing fields: ${validation.missing.join(', ')}`);
  }
  
  // Sanitize and validate email
  const email = sanitizeEmail(req.body.email);
  if (!isValidEmail(email)) {
    return validationError(res, "Invalid email format");
  }
  
  // Create user...
  success(res, user, "User created successfully", 201);
});
```

### Available Response Helpers

```javascript
const { 
  success,          // 200 OK with data
  error,            // 500 error with message
  validationError,  // 400 validation error
  notFound,         // 404 not found
  unauthorized,     // 401 unauthorized
  forbidden         // 403 forbidden
} = require('./utils/apiResponse');

// Usage examples:
success(res, data, "Operation successful");
error(res, "Something went wrong", 500);
validationError(res, "Invalid input");
notFound(res, "User");
unauthorized(res);
forbidden(res, "Admin access required");
```

### Available Validation Utilities

```javascript
const {
  sanitizeInput,           // Sanitize general text
  sanitizeEmail,           // Sanitize email
  sanitizePhone,           // Sanitize phone
  isValidEmail,            // Check if email is valid
  isValidName,             // Check if name is valid (letters only)
  validatePassword,        // Validate password strength
  validateRequiredFields,  // Check required fields
  validateAndParseDate,    // Parse and validate date
  sanitizeObject          // Sanitize multiple fields
} = require('./utils/validation');

// Usage examples:
const name = sanitizeInput(req.body.name);
const email = sanitizeEmail(req.body.email);
const phone = sanitizePhone(req.body.phone);

if (!isValidEmail(email)) {
  return validationError(res, "Invalid email");
}

const passwordCheck = validatePassword(password);
if (!passwordCheck.valid) {
  return validationError(res, passwordCheck.error);
}

const { valid, missing } = validateRequiredFields(req.body, ['name', 'email']);
if (!valid) {
  return validationError(res, `Missing: ${missing.join(', ')}`);
}
```

## For Frontend Developers

### Using the HTTP Client

**Before:**
```typescript
const fetchUsers = async () => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/admin/users`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch');
  }
  
  return response.json();
};
```

**After:**
```typescript
import { httpClient } from '@/services/httpClient';

const fetchUsers = async () => {
  return httpClient.get<User[]>('/admin/users');
};
```

### Creating a New Service

**Before:**
```typescript
class MyService {
  async getAll() {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/my-resource`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.json();
  }
  
  async getById(id: number) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/my-resource/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.json();
  }
  
  // ... more boilerplate
}
```

**After:**
```typescript
import { BaseService } from './BaseService';

interface MyResource {
  id: number;
  name: string;
  // ... other fields
}

class MyService extends BaseService {
  constructor() {
    super('/my-resource');
  }
  
  // Basic CRUD inherited from BaseService:
  // - getAll<T>()
  // - getById<T>(id)
  // - create<T>(data)
  // - update<T>(id, data)
  // - delete<T>(id)
  
  // Add custom methods as needed:
  async customMethod(id: number) {
    return this.http.post(`${this.basePath}/${id}/custom`, {});
  }
}

export const myService = new MyService();
```

### Using Common Components

**Before:**
```typescript
const MyComponent = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState([]);
  
  if (loading) {
    return (
      <Box display="flex" justifyContent="center">
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }
  
  if (data.length === 0) {
    return <Typography>No data</Typography>;
  }
  
  return <div>{/* render data */}</div>;
};
```

**After:**
```typescript
import { Loading, ErrorDisplay, EmptyState } from '@/components/common';

const MyComponent = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState([]);
  
  if (loading) return <Loading message="Loading data..." />;
  if (error) return <ErrorDisplay error={error} onRetry={fetchData} />;
  if (data.length === 0) return <EmptyState message="No data available" />;
  
  return <div>{/* render data */}</div>;
};
```

### Using Form Components

**Before:**
```typescript
<TextField
  fullWidth
  variant="outlined"
  margin="normal"
  type="email"
  label="Email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
/>
```

**After:**
```typescript
import { FormEmailInput } from '@/components/common';

<FormEmailInput
  label="Email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
/>
```

## Common Patterns

### Complete Backend Route Example

```javascript
const { success, error, validationError, notFound } = require('./utils/apiResponse');
const { validateRequiredFields, sanitizeInput } = require('./utils/validation');

router.post('/items', authenticate, requireAdmin, async (req, res) => {
  try {
    // 1. Validate required fields
    const validation = validateRequiredFields(req.body, ['name', 'description']);
    if (!validation.valid) {
      return validationError(res, `Missing: ${validation.missing.join(', ')}`);
    }
    
    // 2. Sanitize inputs
    const name = sanitizeInput(req.body.name);
    const description = sanitizeInput(req.body.description);
    
    // 3. Business logic
    const item = await prisma.item.create({
      data: { name, description }
    });
    
    // 4. Send response
    success(res, item, "Item created successfully", 201);
  } catch (err) {
    console.error('Create item error:', err);
    error(res, "Failed to create item");
  }
});
```

### Complete Frontend Service Example

```typescript
import { BaseService } from './BaseService';
import { httpClient } from './httpClient';

interface Item {
  id: number;
  name: string;
  description: string;
}

class ItemService extends BaseService {
  constructor() {
    super('/admin/items');
  }
  
  // Use inherited methods
  async getAllItems(): Promise<Item[]> {
    return this.getAll<Item>();
  }
  
  async getItem(id: number): Promise<Item> {
    return this.getById<Item>(id);
  }
  
  async createItem(data: Omit<Item, 'id'>): Promise<Item> {
    return this.create<Item>(data);
  }
  
  async updateItem(id: number, data: Partial<Item>): Promise<Item> {
    return this.update<Item>(id, data);
  }
  
  async deleteItem(id: number): Promise<void> {
    return this.delete<void>(id);
  }
  
  // Custom methods
  async searchItems(query: string): Promise<Item[]> {
    return this.http.get<Item[]>(`${this.basePath}/search?q=${query}`);
  }
}

export const itemService = new ItemService();
```

## Tips

### Backend
1. **Always use response helpers** for consistency
2. **Always validate and sanitize** user input
3. **Use try-catch** blocks in route handlers
4. **Log errors** before sending error responses
5. **Keep routes thin** - move business logic to services (future improvement)

### Frontend
1. **Use httpClient** for all API calls
2. **Extend BaseService** for new services
3. **Use common components** to avoid duplication
4. **Handle loading and error states** consistently
5. **Type everything** with TypeScript interfaces

## Need Help?

- Check `REFACTORING.md` for detailed documentation
- Look at existing code for examples
- Read inline comments in utility files
- Ask the team for clarification

## Gradual Migration

You don't have to refactor everything at once:
- ✅ Use new utilities in **new code**
- ✅ Refactor **when you touch old code**
- ⚠️ Don't refactor working code unless necessary
- ⚠️ Test thoroughly after refactoring

---

Happy coding! 🚀
