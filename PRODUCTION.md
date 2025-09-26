# Production Environment Configuration

This file contains additional production-specific configuration and security recommendations.

## Security Checklist

### 1. Database Security
- [ ] Change default database credentials (`user`/`password`)
- [ ] Use strong passwords (minimum 16 characters)
- [ ] Consider using PostgreSQL user with limited privileges

### 2. Application Security  
- [ ] Update JWT secret key (`SECRET_KEY` in .env)
- [ ] Change MinIO credentials (`MINIO_ROOT_USER`/`MINIO_ROOT_PASSWORD`)
- [ ] Review CORS allowed origins
- [ ] Set up proper firewall rules

### 3. SSL/TLS
- [x] Let's Encrypt certificates configured
- [x] HTTP to HTTPS redirect enabled
- [x] Security headers configured

### 4. Monitoring
- [x] Health checks configured
- [x] Restart policies set to `always`
- [ ] Set up log aggregation
- [ ] Configure monitoring/alerting

## Environment Variables for Production

Create a production `.env` file with:

```bash
# Database - Use strong credentials!
DATABASE_URL=postgresql://strong_user:very_strong_password@db:5432/mydb

# JWT Secret - Generate a new one!
SECRET_KEY="your_very_long_and_random_secret_key_here"

# MinIO - Change these!
MINIO_ACCESS_KEY=your_access_key
MINIO_SECRET_KEY=your_very_strong_secret_key

# Production settings
NODE_ENV=production
```

## Firewall Configuration

Allow only necessary ports:
```bash
# UFW example
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp  # SSH only
sudo ufw enable
```

## Backup Strategy

Set up automated backups for:
- PostgreSQL database: `docker-compose exec db pg_dump -U user mydb > backup.sql`
- MinIO data: Back up the `minio_data` volume
- Application uploads/files

## Monitoring Commands

```bash
# Check service status
docker-compose ps

# View logs
docker-compose logs -f [service_name]

# Check resource usage
docker stats

# Check SSL certificate
openssl s_client -connect popa-stefan.be:443 -servername popa-stefan.be
```

## Troubleshooting

### Service won't start
1. Check logs: `docker-compose logs [service_name]`
2. Check disk space: `df -h`
3. Check memory: `free -m`

### SSL issues
1. Check domain DNS: `dig popa-stefan.be`
2. Check Let's Encrypt logs: `docker-compose logs traefik | grep acme`
3. Verify port 80 is accessible from internet

### Database connection issues
1. Check if database is running: `docker-compose ps db`
2. Test connection: `docker-compose exec backend npx prisma db pull`
3. Check environment variables