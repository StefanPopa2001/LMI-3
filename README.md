# LMI 3

Monorepo containing backend (Node/Express + Prisma + PostgreSQL) and frontend (Next.js + MUI + Tailwind) for attendance & replacement request (RR) management.

## Quick Start

### Development

Start both backend and frontend concurrently:

```bash
npm run dev
```

The application will be available at:
- Frontend: `http://localhost:3000/lmi3`
- Backend API: `http://localhost:4000`
- GraphQL: `http://localhost:4000/graphql`

### Environment Variables

Create a `.env` file in the root directory (see `.env.example` for reference):

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/lmi3_db

# Redis
REDIS_URL=redis://localhost:6379

# MinIO
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=admin
MINIO_SECRET_KEY=adminadmin
DRIVE_BUCKET=drive

# JWT
SECRET_KEY=your-secret-key-change-this

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:4000
```

## Project Structure

```
LMI-3/
├── backend/              # Node.js + Express backend
│   ├── app.js           # Main application setup
│   ├── index.js         # Server entry point
│   ├── config/          # Configuration modules
│   ├── middleware/      # Express middleware
│   ├── routes/          # API route handlers
│   ├── utils/           # Utility functions
│   └── prisma/          # Database schema
├── frontend/            # Next.js frontend
│   ├── src/
│   │   ├── app/         # Next.js app directory
│   │   ├── components/  # React components
│   │   ├── services/    # API services
│   │   ├── theme/       # Theme configuration
│   │   └── utils/       # Utility functions
│   └── public/          # Static assets
└── docs/                # Documentation
```

## Documentation

- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Production deployment guide
- **[REFACTORING.md](REFACTORING.md)** - Code refactoring and architecture documentation
- **[backend/COPILOT_README.md](backend/COPILOT_README.md)** - Backend development guide
- **[docs/COPILOT_SERVER_DB.md](docs/COPILOT_SERVER_DB.md)** - Server and database reference

## Replacement Requests (RR) Types

Two RR types exist:

1. **Rattrapage même semaine** (`same_week`)
   - Destination must be in the same ISO week as the origin
   - Destination must be in the future (no past dates)
   - Destination classe level must match origin level OR be empty
   - No deduction of `rrRestantes` (penalizeRR = false automatically)

2. **Récupération cours du soir** (`evening_recuperation`)
   - Destination must be a class with `isRecuperation = true`
   - Level rule: destination level must match origin level OR be empty
   - If destination level is empty, it becomes locked to origin level upon RR creation
   - Optional deduction of `rrRestantes` via checkbox (default = true)
   - Destination cannot be in the past

### Schema Fields

```prisma
Classe.isRecuperation Boolean @default(false)
ReplacementRequest.rrType String @default("same_week") // same_week | evening_recuperation
ReplacementRequest.penalizeRR Boolean @default(true)
```

See `backend/MIGRATION_NOTES.md` for migration steps and backfill notes.

## Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis
- **Storage**: MinIO (S3-compatible)
- **Authentication**: JWT
- **API**: REST + GraphQL (Apollo Server)

### Frontend
- **Framework**: Next.js 14 (App Router)
- **UI Library**: Material-UI (MUI)
- **Styling**: Tailwind CSS
- **State Management**: React Hooks
- **HTTP Client**: Custom fetch wrapper
- **Type Safety**: TypeScript

### DevOps
- **Containerization**: Docker + Docker Compose
- **Reverse Proxy**: Traefik
- **SSL**: Let's Encrypt (via Traefik)
- **Deployment**: VPS with Docker Swarm (optional)

## Development Workflow

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up database**:
   ```bash
   cd backend
   npx prisma migrate dev
   npx prisma generate
   ```

3. **Create admin user**:
   ```bash
   cd backend
   node create-admin.js
   ```

4. **Start development servers**:
   ```bash
   npm run dev
   ```

## Production Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed production deployment instructions.

Quick deployment:
```bash
docker-compose up -d --build
docker-compose exec backend_lmi3 npx prisma migrate deploy
```

## Features

- **User Management**: Create, update, and manage users with role-based access
- **Student Management**: Track student information and enrollment
- **Class Management**: Organize classes with teachers and schedules
- **Attendance Tracking**: Mark and monitor student attendance
- **Replacement Requests**: Handle teacher replacements and make-up classes
- **File Management**: Upload and organize files with MinIO
- **Statistics**: View attendance and performance statistics
- **Email Notifications**: Send emails for important events

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

Internal project - All rights reserved.

## Support

For issues and questions, contact the development team.
