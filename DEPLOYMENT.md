# Deployment Guide for LMI-3 (popa-stefan.be/lmi3)# Deployment Guide for Logiscool (popa-stefan.be)



This guide explains how to deploy the LMI-3 application to a VPS using Docker Compose and Traefik as a reverse proxy.This guide explains how to deploy the Logiscool application to a VPS using Docker Compose and Traefik as a reverse proxy.



## Prerequisites## Prerequisites



- VPS with Docker and Docker Compose installed- VPS with Docker and Docker Compose installed

- Domain `popa-stefan.be` pointing to your VPS IP address- Domain `popa-stefan.be` pointing to your VPS IP address

- SSH access to the VPS- SSH access to the VPS

- Traefik reverse proxy running on the `starcozka-app-network` Docker network

## Environment Setup

## Environment Setup

1. Clone or upload the project to your VPS:

1. Clone or upload the project to your VPS:   ```bash

   ```bash   git clone <your-repo> /path/to/logiscool

   git clone <your-repo> /path/to/lmi3   cd /path/to/logiscool/LMI-3

   cd /path/to/lmi3/LMI-3   ```

   ```

2. Ensure you have a `.env` file in the root directory with necessary environment variables (similar to development).

2. Create a `.env` file in the root directory with necessary environment variables:

   ```bash3. Update the email in `docker-compose.yml` if needed (currently set to `admin@popa-stefan.be` for Let's Encrypt).

   # Database configuration

   POSTGRES_DB=lmi3_db## Deployment Steps

   POSTGRES_USER=lmi3_user

   POSTGRES_PASSWORD=your_secure_password1. Build and start the services:

   DATABASE_URL=postgresql://lmi3_user:your_secure_password@db_postgres_lmi3:5432/lmi3_db   ```bash

      docker-compose up -d --build

   # Redis configuration   ```

   REDIS_URL=redis://redis_lmi3:6379

   2. Check that all services are running:

   # MinIO configuration   ```bash

   MINIO_ENDPOINT=minio   docker-compose ps

   MINIO_PORT=9000   ```

   MINIO_ACCESS_KEY=your_access_key

   MINIO_SECRET_KEY=your_secret_key3. Verify Traefik is working by accessing the dashboard at `http://your-vps-ip:8080` (insecure, for testing only).

   DRIVE_BUCKET=drive

   ## Domain Configuration

   # JWT Secret

   SECRET_KEY=your_jwt_secret_key_change_this- The domain `popa-stefan.be` should point to your VPS IP.

   - Traefik will automatically obtain SSL certificates from Let's Encrypt.

   # Optional: Debug mode (DO NOT use in production)- HTTP traffic is redirected to HTTPS.

   DEBUG_NO_VALIDATION=false

   DEFAULT_PASSWORD=change_this_password## Service Routing

   

   # Build ID- Frontend (Next.js): `https://popa-stefan.be/`

   BUILD_ID=production-$(date +%Y%m%d-%H%M%S)- Backend API: `https://popa-stefan.be/api/*`

   ```- Traefik Dashboard: `http://your-vps-ip:8080` (internal access only)



3. Ensure the external Docker network exists:## SSL Certificates

   ```bash

   docker network create starcozka-app-network- Certificates are stored in `./letsencrypt/acme.json`

   ```- Automatic renewal is handled by Traefik



## Deployment Steps## Troubleshooting



1. Build and start the services:1. Check logs:

   ```bash   ```bash

   docker-compose up -d --build   docker-compose logs traefik

   ```   docker-compose logs backend

   docker-compose logs frontend

2. Check that all services are running:   ```

   ```bash

   docker-compose ps2. If SSL fails, ensure port 80 is open and domain is correctly pointed.

   ```

3. For CORS issues, verify the allowed origins in the Traefik labels.

3. Run database migrations:

   ```bash## Updates

   docker-compose exec backend_lmi3 npx prisma migrate deploy

   ```To update the application:

```bash

4. Check logs for any errors:docker-compose down

   ```bashgit pull

   docker-compose logs -f backend_lmi3docker-compose up -d --build

   docker-compose logs -f frontend_lmi3```

   ```

## Security Notes

## Domain Configuration

- Change default database passwords in production

- The domain `popa-stefan.be` should point to your VPS IP- Restrict Traefik dashboard access in production (remove `--api.insecure=true`)

- Traefik automatically obtains SSL certificates from Let's Encrypt- Ensure firewall allows only necessary ports (80, 443)
- HTTP traffic is redirected to HTTPS

## Service Routing

- **Frontend (Next.js)**: `https://popa-stefan.be/lmi3`
- **Backend API**: `https://popa-stefan.be/lmi3/api`
- **Health Check**: `https://popa-stefan.be/lmi3/api/health`

## SSL Certificates

- Certificates are stored in `./letsencrypt/acme.json`
- Automatic renewal is handled by Traefik
- Ensure port 80 and 443 are open on your firewall

## Troubleshooting

1. **Check service logs**:
   ```bash
   docker-compose logs traefik
   docker-compose logs backend_lmi3
   docker-compose logs frontend_lmi3
   ```

2. **SSL certificate issues**:
   - Ensure port 80 is open for ACME challenge
   - Verify domain DNS points to correct IP
   - Check Traefik logs for certificate errors

3. **CORS issues**:
   - Verify allowed origins in `backend/middleware/cors.js`
   - Check Traefik labels in `docker-compose.yml`

4. **Database connection errors**:
   - Ensure DATABASE_URL environment variable is correct
   - Check if PostgreSQL container is running
   - Verify network connectivity between services

5. **API not accessible**:
   - Check if Traefik is properly routing requests
   - Verify backend health endpoint: `https://popa-stefan.be/lmi3/api/health`
   - Check Traefik dashboard (if enabled)

## Updates

To update the application:
```bash
# Pull latest changes
git pull

# Rebuild and restart services
docker-compose down
docker-compose up -d --build

# Run any new migrations
docker-compose exec backend_lmi3 npx prisma migrate deploy
```

## Backup

### Database Backup
```bash
docker-compose exec db_postgres_lmi3 pg_dump -U lmi3_user lmi3_db > backup_$(date +%Y%m%d).sql
```

### MinIO Backup
MinIO data is stored in `/home/starco/volumes/lmi3/minio` on the host.

## Security Notes

- **Change default passwords** in production (database, MinIO, etc.)
- **Restrict Traefik dashboard** access in production
- **Set strong SECRET_KEY** for JWT tokens
- **Never enable DEBUG_NO_VALIDATION** in production
- **Regularly update dependencies** and Docker images
- **Monitor logs** for suspicious activity
- **Use firewall** to restrict access to necessary ports only (80, 443)
