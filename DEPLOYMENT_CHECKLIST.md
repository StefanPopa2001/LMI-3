# Deployment Verification Checklist

Use this checklist to verify the application is working correctly after deployment to `popa-stefan.be/lmi3`.

## Pre-Deployment

- [ ] Review and update `.env` file with production values
- [ ] Ensure `SECRET_KEY` is set to a strong, unique value
- [ ] Verify `DATABASE_URL` points to production database
- [ ] Confirm `NEXT_PUBLIC_API_URL` is set to `https://popa-stefan.be/lmi3/api`
- [ ] Set `DEBUG_NO_VALIDATION=false` in production
- [ ] Check Docker network `starcozka-app-network` exists
- [ ] Verify Traefik is running and configured

## Deployment Steps

- [ ] Build and start services: `docker-compose up -d --build`
- [ ] Check all services are running: `docker-compose ps`
- [ ] Run database migrations: `docker-compose exec backend_lmi3 npx prisma migrate deploy`
- [ ] Check logs for errors: `docker-compose logs -f backend_lmi3`
- [ ] Check frontend logs: `docker-compose logs -f frontend_lmi3`

## Network Configuration Verification

### DNS and SSL
- [ ] Domain `popa-stefan.be` resolves to correct IP
- [ ] Port 80 is open (for ACME challenge)
- [ ] Port 443 is open (for HTTPS)
- [ ] SSL certificate is obtained (check Traefik logs)
- [ ] HTTP redirects to HTTPS

### Endpoints Accessible
- [ ] Frontend: `https://popa-stefan.be/lmi3` loads
- [ ] Health check: `https://popa-stefan.be/lmi3/api/health` returns OK
- [ ] Root API: `https://popa-stefan.be/lmi3/api` returns server info
- [ ] GraphQL: `https://popa-stefan.be/lmi3/api/graphql` accessible

## CORS Verification

- [ ] Frontend can make API requests to backend
- [ ] Login functionality works from frontend
- [ ] File uploads work
- [ ] No CORS errors in browser console
- [ ] Preflight OPTIONS requests succeed

## Authentication Flow

- [ ] Login page loads: `https://popa-stefan.be/lmi3/login`
- [ ] Can log in with admin credentials
- [ ] JWT token is stored in localStorage
- [ ] Protected routes redirect to login when not authenticated
- [ ] Logout functionality works
- [ ] Token refresh works (if implemented)

## Core Features Testing

### User Management
- [ ] Can view list of users
- [ ] Can create new user
- [ ] Can edit user details
- [ ] Can delete user
- [ ] Can reset user password
- [ ] User profile page works

### Student Management
- [ ] Can view list of students (élèves)
- [ ] Can create new student
- [ ] Can edit student details
- [ ] Can delete student
- [ ] Student details modal works

### Class Management
- [ ] Can view list of classes
- [ ] Can create new class
- [ ] Can edit class details
- [ ] Can delete class
- [ ] Can assign students to class
- [ ] Can assign teacher to class

### Attendance
- [ ] Attendance calendar loads
- [ ] Can mark student as present
- [ ] Can mark student as absent
- [ ] Can add attendance notes
- [ ] Attendance statistics display correctly
- [ ] Week navigation works

### Replacement Requests (RR)
- [ ] Can create same-week RR
- [ ] Can create evening recuperation RR
- [ ] RR validation rules work correctly
- [ ] RR status updates work
- [ ] RR list displays correctly

### File Management (Drive)
- [ ] Can view files and folders
- [ ] Can upload file
- [ ] Can create folder
- [ ] Can delete file
- [ ] Can delete folder
- [ ] File preview works
- [ ] File download works

### Statistics
- [ ] Stats dashboard loads
- [ ] Attendance statistics display
- [ ] Charts render correctly
- [ ] Date filters work

## Performance Checks

- [ ] Frontend loads in < 3 seconds
- [ ] API requests complete in < 1 second (for most endpoints)
- [ ] No memory leaks (check after 30 minutes of use)
- [ ] No excessive logging
- [ ] Static assets load quickly
- [ ] Images load correctly

## Browser Compatibility

- [ ] Works in Chrome/Chromium
- [ ] Works in Firefox
- [ ] Works in Safari
- [ ] Works in Edge
- [ ] Mobile responsive layout works

## Security Checks

- [ ] `DEBUG_NO_VALIDATION` is set to `false`
- [ ] Strong passwords required
- [ ] SQL injection protection (via Prisma)
- [ ] XSS protection (input sanitization)
- [ ] CSRF protection (if applicable)
- [ ] Rate limiting works on auth endpoints
- [ ] Admin routes require admin privileges
- [ ] File upload size limits enforced

## Database Verification

- [ ] Database connection is stable
- [ ] Migrations applied successfully
- [ ] Can query data
- [ ] Can insert data
- [ ] Can update data
- [ ] Can delete data
- [ ] Foreign key constraints work
- [ ] Indexes are created

## Redis Verification

- [ ] Redis connection works
- [ ] Session storage works (if using Redis sessions)
- [ ] Cache invalidation works
- [ ] No connection errors in logs

## MinIO Verification

- [ ] MinIO connection works
- [ ] Bucket exists
- [ ] Can upload files
- [ ] Can download files
- [ ] Can delete files
- [ ] Presigned URLs work
- [ ] Proxy streaming works

## Logging

- [ ] Backend logs are being written
- [ ] Frontend logs can be sent to backend
- [ ] Error logs are captured
- [ ] Log rotation is configured (if applicable)
- [ ] No sensitive data in logs

## Monitoring

- [ ] Health check endpoint returns correct status
- [ ] Can monitor service uptime
- [ ] Disk space is sufficient
- [ ] Memory usage is acceptable
- [ ] CPU usage is acceptable

## Backup Verification

- [ ] Database backup script works
- [ ] Database backup can be restored
- [ ] MinIO data is backed up
- [ ] Volume mounts are correct
- [ ] Backup schedule is configured (if applicable)

## Error Handling

- [ ] 404 errors display correctly
- [ ] 500 errors are logged
- [ ] Network errors are handled gracefully
- [ ] User sees friendly error messages
- [ ] Retry functionality works where applicable

## Documentation

- [ ] README.md is up to date
- [ ] DEPLOYMENT.md is accurate
- [ ] REFACTORING.md documents changes
- [ ] API endpoints are documented
- [ ] Environment variables are documented

## Post-Deployment

- [ ] Notify team of deployment
- [ ] Monitor logs for first 24 hours
- [ ] Watch for unusual errors
- [ ] Test with real users
- [ ] Gather feedback
- [ ] Document any issues
- [ ] Create tickets for bugs
- [ ] Schedule follow-up deployment if needed

## Rollback Plan

- [ ] Previous version tagged in git
- [ ] Database backup exists
- [ ] Rollback procedure documented
- [ ] Team knows how to rollback
- [ ] Rollback can be done in < 15 minutes

## Sign-Off

- [ ] Technical lead approval
- [ ] QA testing complete
- [ ] Product owner acceptance
- [ ] Documentation complete
- [ ] Team trained on changes

---

**Deployment Date**: _______________
**Deployed By**: _______________
**Version**: _______________
**Status**: [ ] Success [ ] Partial [ ] Failed
**Notes**: _______________
