# Deployment Guide for Logiscool (popa-stefan.be)

This guide explains how to deploy the Logiscool application to a VPS using Docker Compose and Traefik as a reverse proxy.

## Prerequisites

- VPS with Docker and Docker Compose installed
- Domain `popa-stefan.be` pointing to your VPS IP address
- SSH access to the VPS

## Environment Setup

1. Clone or upload the project to your VPS:
   ```bash
   git clone <your-repo> /path/to/logiscool
   cd /path/to/logiscool/LMI-3
   ```

2. Ensure you have a `.env` file in the root directory with necessary environment variables (similar to development).

3. Update the email in `docker-compose.yml` if needed (currently set to `admin@popa-stefan.be` for Let's Encrypt).

## Deployment Steps

1. Build and start the services:
   ```bash
   docker-compose up -d --build
   ```

2. Check that all services are running:
   ```bash
   docker-compose ps
   ```

3. Verify Traefik is working by accessing the dashboard at `http://your-vps-ip:8080` (insecure, for testing only).

## Domain Configuration

- The domain `popa-stefan.be` should point to your VPS IP.
- Traefik will automatically obtain SSL certificates from Let's Encrypt.
- HTTP traffic is redirected to HTTPS.

## Service Routing

- Frontend (Next.js): `https://popa-stefan.be/`
- Backend API: `https://popa-stefan.be/api/*`
- Traefik Dashboard: `http://your-vps-ip:8080` (internal access only)

## SSL Certificates

- Certificates are stored in `./letsencrypt/acme.json`
- Automatic renewal is handled by Traefik

## Troubleshooting

1. Check logs:
   ```bash
   docker-compose logs traefik
   docker-compose logs backend
   docker-compose logs frontend
   ```

2. If SSL fails, ensure port 80 is open and domain is correctly pointed.

3. For CORS issues, verify the allowed origins in the Traefik labels.

## Updates

To update the application:
```bash
docker-compose down
git pull
docker-compose up -d --build
```

## Security Notes

- Change default database passwords in production
- Restrict Traefik dashboard access in production (remove `--api.insecure=true`)
- Ensure firewall allows only necessary ports (80, 443)