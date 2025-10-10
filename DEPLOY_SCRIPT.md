# Deploy Script Documentation

## Overview

The `deploy.sh` script provides a production-ready deployment workflow for the LMI-3 application with zero-downtime deployment capabilities.

## Features

- ✅ **Two Build Modes**: Fast (cached) and Complete (no cache)
- ✅ **Health Checks**: Validates services before switching
- ✅ **Zero Downtime**: Tests new containers before stopping old ones
- ✅ **Automatic Rollback**: Reverts to previous version if deployment fails
- ✅ **Database Migrations**: Automatically runs Prisma migrations
- ✅ **Admin User Check**: Creates default admin if none exists
- ✅ **Color-coded Output**: Easy to read logs
- ✅ **Comprehensive Error Handling**: Fails safely with detailed logs

## Usage

```bash
./deploy.sh
```

When prompted, select deployment mode:
- **Option 1 - Fast Rebuild**: Uses Docker cache, faster builds (recommended for code changes)
- **Option 2 - Complete Rebuild**: No cache, pulls fresh images, slower but guaranteed clean build

## Deployment Flow

### 1. Pre-Deployment Checks
- Verifies Docker is running
- Checks for docker-compose.yml
- Ensures Docker network exists
- Loads environment variables

### 2. Build Mode Selection
- Interactive prompt for Fast vs Complete rebuild
- Fast mode: Uses cache for faster builds
- Complete mode: No cache, clean build from scratch

### 3. Backup Current State
- Tags current images as 'previous'
- Enables rollback if new deployment fails

### 4. Build New Images
- Builds backend_lmi3 with selected options
- Builds frontend_lmi3 with selected options
- Fails immediately if build errors occur

### 5. Test New Images
- Starts database and Redis first
- Starts backend and performs health check (60s timeout)
- Starts frontend and performs health check (60s timeout)
- **Automatic rollback if health checks fail**

### 6. Database Migrations
- Runs Prisma migrations with 3 retry attempts
- Ensures database schema is up to date

### 7. Admin User Check
- Checks if admin user exists in database
- Automatically runs `create-admin.js` if no admin found
- Displays credentials if new admin created

### 8. Cleanup
- Removes old Docker images
- Removes backup images (if deployment successful)
- Prunes dangling images

### 9. Final Status
- Displays deployment summary
- Shows service status
- Provides useful commands for monitoring

## Health Check Details

### Backend Health Check
- Endpoint: `http://localhost:4000/health`
- Timeout: 60 seconds (12 attempts, 5s each)
- Failure Action: Automatic rollback to previous version

### Frontend Health Check
- Endpoint: `http://localhost:3000`
- Timeout: 60 seconds (12 attempts, 5s each)
- Failure Action: Automatic rollback to previous version

## Rollback Mechanism

If deployment fails at any stage:
1. Script detects failure (build error, health check failure)
2. Logs are displayed for debugging
3. Previous images are restored from 'previous' tag
4. Old containers are restarted
5. Script exits with error code

## Admin User Creation

The script automatically checks for admin users:
- Uses Node.js inline script to query database
- If no admin found, runs `backend/create-admin.js`
- Default credentials are displayed in output
- **Important**: Change default password after first login

## Environment Variables

Ensure `.env` file contains:
```bash
POSTGRES_DB=lmi3_db
POSTGRES_USER=lmi3_user
POSTGRES_PASSWORD=your_secure_password
DATABASE_URL=postgresql://...
SECRET_KEY=your_jwt_secret
NEXT_PUBLIC_API_URL=https://popa-stefan.be/lmi3/api
```

## Build Modes Comparison

### Fast Rebuild (Option 1)
**When to use:**
- Regular deployments
- Code changes only
- Quick iterations
- Testing in production

**Advantages:**
- Faster build times (uses cache)
- Less bandwidth usage
- Quick deployments

**Disadvantages:**
- May use stale cached layers
- Could miss base image updates

### Complete Rebuild (Option 2)
**When to use:**
- Major version updates
- Dependency changes
- Security updates
- Production release
- Debugging cache issues

**Advantages:**
- Guaranteed fresh build
- Latest base images
- Clean slate
- Best for production

**Disadvantages:**
- Slower build times
- More bandwidth usage
- Downloads all layers

## Common Issues and Solutions

### Issue: Health check fails
**Solution:**
- Check logs: `docker compose logs backend_lmi3`
- Verify environment variables
- Check database connectivity
- Ensure ports are available

### Issue: Migration fails
**Solution:**
- Check database connection
- Verify DATABASE_URL in .env
- Check if database is accessible
- Review migration files for errors

### Issue: Admin creation fails
**Solution:**
- Run manually: `docker compose exec backend_lmi3 node create-admin.js`
- Check database connectivity
- Verify Prisma client is generated

### Issue: Build fails
**Solution:**
- Check Docker disk space
- Try complete rebuild (option 2)
- Review build logs
- Ensure all dependencies are available

## Post-Deployment Verification

After successful deployment, verify:

1. **Frontend accessible**: Visit `https://popa-stefan.be/lmi3`
2. **API health**: Check `https://popa-stefan.be/lmi3/api/health`
3. **Login works**: Test with admin credentials
4. **Database migrations**: Verify schema is correct
5. **Services running**: `docker compose ps`

## Useful Commands

```bash
# View service logs
docker compose logs -f backend_lmi3
docker compose logs -f frontend_lmi3

# Check service status
docker compose ps

# Restart a service
docker compose restart backend_lmi3

# Stop all services
docker compose down

# Resource usage
docker compose stats

# Create/recreate admin user
docker compose exec backend_lmi3 node create-admin.js

# Access backend shell
docker compose exec backend_lmi3 sh

# Check database
docker compose exec db_postgres_lmi3 psql -U lmi3_user -d lmi3_db
```

## Deployment Checklist

Before running `./deploy.sh`:

- [ ] Backup current database
- [ ] Review changes in git
- [ ] Test locally
- [ ] Update .env if needed
- [ ] Ensure sufficient disk space
- [ ] Check Docker is running
- [ ] Verify network access
- [ ] Notify team (for production)

After running `./deploy.sh`:

- [ ] Verify frontend loads
- [ ] Test login functionality
- [ ] Check API endpoints
- [ ] Monitor logs for errors
- [ ] Test critical features
- [ ] Verify admin user exists
- [ ] Document deployment

## Emergency Procedures

### Manual Rollback
If automatic rollback fails:
```bash
# Stop current containers
docker compose down

# Restore previous images
docker tag lmi-3-backend_lmi3:previous lmi-3-backend_lmi3:latest
docker tag lmi-3-frontend_lmi3:previous lmi-3-frontend_lmi3:latest

# Start services
docker compose up -d
```

### Force Recreate All
```bash
docker compose down --volumes
docker compose up -d --build --force-recreate
docker compose exec backend_lmi3 npx prisma migrate deploy
docker compose exec backend_lmi3 node create-admin.js
```

## Security Notes

- Script requires `.env` file with sensitive data
- Admin credentials are displayed in output (secure your terminal)
- Old images are deleted after successful deployment
- Ensure Docker socket has appropriate permissions
- Review logs before sharing (may contain secrets)

## Contributing

When modifying the deploy script:
1. Test in development environment first
2. Test both fast and complete rebuild modes
3. Test rollback scenarios
4. Update this documentation
5. Commit changes with descriptive message

## Support

For issues with deployment:
1. Check logs: `docker compose logs`
2. Review error messages from script
3. Consult DEPLOYMENT.md for troubleshooting
4. Check Docker and Docker Compose versions
5. Verify network connectivity

---

**Version**: 2.0.0  
**Last Updated**: 2025-10-10  
**Compatibility**: Docker 20+, Docker Compose v2+
