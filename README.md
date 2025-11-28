# DataForge - Secure ETL Platform

A comprehensive, SOC-aligned ETL platform that combines browser-based DuckDB WASM processing with a powerful backend for heavy workloads, complete with MySQL metadata storage, MinIO object storage, and comprehensive audit logging.

## 🏗️ Architecture

### Frontend (React + Vite)
- **DuckDB WASM**: Client-side SQL processing for privacy and speed
- **Monaco Editor**: Professional SQL editing experience
- **Shadcn UI**: Modern, accessible component library
- **Authentication**: Protected routes with role-based access

### Backend (FastAPI + Python)
- **DuckDB CLI**: Server-side processing for heavy queries
- **MySQL**: Persistent storage for metadata, users, workflows, audit logs
- **MinIO**: S3-compatible object storage for data files
- **Security**: End-to-end encryption, SQL injection prevention, audit logging

### Infrastructure (Docker Compose)
- **API Service**: FastAPI backend (Port 8000)
- **MySQL Database**: Metadata storage (Port 3306)
- **phpMyAdmin**: Database management (Port 8080)
- **MinIO**: Object storage (Port 9000, Console: 9001)

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+
- Git

### 1. Clone and Setup

```bash
git clone <repository-url>
cd duckdb-studio
```

### 2. Start Backend Infrastructure

```bash
# Start all backend services
docker-compose up -d --build

# Initialize database tables
docker-compose exec api python -m app.db.init_db

# Check service status
docker-compose ps
```

### 3. Start Frontend

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### 4. Access the Application

- **Frontend**: http://localhost:5173
- **Backend API Docs**: http://localhost:8000/docs
- **phpMyAdmin**: http://localhost:8080
  - Username: `user`
  - Password: `password`
- **MinIO Console**: http://localhost:9001
  - Username: `minioadmin`
  - Password: `minioadmin`

## 📋 Features

### Data Processing
- ✅ **Dual Processing Modes**: Client-side WASM or server-side CLI
- ✅ **File Support**: CSV, JSON, Parquet
- ✅ **SQL Editor**: Syntax highlighting, auto-completion
- ✅ **Query Templates**: Save and reuse common queries
- ✅ **Extensions**: MySQL, PostgreSQL, S3, HTTP connectors

### Workflows & Automation
- ✅ **Scheduled Workflows**: Cron-based automation
- ✅ **Workflow Management**: Create, edit, delete, monitor
- ✅ **Execution History**: Track all workflow runs
- ✅ **Error Handling**: Automatic retry and alerting

### Storage & Security
- ✅ **Multi-Storage**: S3, MinIO, or local storage
- ✅ **Encryption**: End-to-end encryption for sensitive data
- ✅ **Access Control**: Role-based permissions
- ✅ **Audit Logging**: Complete activity tracking
- ✅ **SQL Injection Prevention**: Query validation and sanitization

### Compliance & Monitoring
- ✅ **Audit Logs**: All user actions tracked
- ✅ **SOC-Aligned**: Security best practices
- ✅ **Backup Support**: Database and object storage backups
- ✅ **Health Checks**: Service monitoring endpoints

## 🔧 Development

### Backend Development

```bash
# Rebuild API container
docker-compose up -d --build api

# View logs
docker-compose logs -f api

# Run database migrations
docker-compose exec api alembic upgrade head

# Access API container shell
docker-compose exec api bash
```

### Frontend Development

```bash
# Install dependencies
npm install

# Start dev server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Generate Changelog

```bash
npm run changelog
```

## 📊 Database Schema

### Users
- Authentication and authorization
- Role-based access control (admin/user)

### Workflows
- Scheduled ETL pipelines
- Query definitions and schedules

### Workflow Executions
- Execution history and results
- Error tracking

### Storage Configs
- Encrypted S3/MinIO credentials
- Per-user storage configuration

### Audit Logs
- Complete activity tracking
- IP address and user agent logging
- Searchable and filterable

### Query Templates
- Reusable SQL queries
- Public/private sharing

## 🔐 Security Features

### Encryption
- **At Rest**: All sensitive data encrypted in database
- **In Transit**: HTTPS/TLS for all communications
- **Key Management**: Environment-based key storage

### Authentication
- JWT-based authentication (to be implemented)
- Session management
- Password hashing with bcrypt

### Authorization
- Role-based access control
- Resource-level permissions
- Audit trail for all actions

### Input Validation
- SQL injection prevention
- Input sanitization
- Query validation

## 🐳 Docker Services

### API Service
```yaml
Ports: 8000
Environment:
  - DATABASE_URL
  - MINIO_ENDPOINT
  - ENCRYPTION_KEY
Volumes:
  - ./backend:/app
  - duckdb_data:/data
```

### MySQL Database
```yaml
Ports: 3306
Credentials:
  - Root: rootpassword
  - User: user/password
Volume: mysql_data
```

### MinIO
```yaml
Ports: 9000 (API), 9001 (Console)
Credentials: minioadmin/minioadmin
Volume: minio_data
```

## 📝 API Endpoints

### Execute
- `POST /api/v1/execute/run` - Run DuckDB query
- `GET /api/v1/execute/extensions` - List available extensions

### Workflows
- `GET /api/v1/workflows/` - List workflows
- `POST /api/v1/workflows/` - Create workflow
- `GET /api/v1/workflows/{id}` - Get workflow
- `DELETE /api/v1/workflows/{id}` - Delete workflow

### Storage
- `POST /api/v1/storage/config` - Save storage config
- `GET /api/v1/storage/config` - Get storage config
- `GET /api/v1/storage/buckets` - List buckets
- `POST /api/v1/storage/test` - Test connection

### Audit
- `GET /api/v1/audit/` - Get user audit logs
- `GET /api/v1/audit/all` - Get all logs (admin)

## 🔄 Backup & Recovery

### Database Backup
```bash
docker-compose exec db mysqldump -u user -ppassword dataforge > backup.sql
```

### Restore Database
```bash
docker-compose exec -T db mysql -u user -ppassword dataforge < backup.sql
```

### MinIO Backup
```bash
# Use MinIO client (mc)
mc mirror minio/dataforge ./minio-backup
```

## 🚦 Health Monitoring

```bash
# Check API health
curl http://localhost:8000/health

# Check all services
docker-compose ps
```

## 📦 Production Deployment

### Environment Variables

Create `.env` file:
```bash
DATABASE_URL=mysql+pymysql://user:password@db/dataforge
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
ENCRYPTION_KEY=<generate-secure-key>
JWT_SECRET=<generate-secure-secret>
```

### Build Production Images

```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Troubleshooting

### API Container Won't Start
```bash
docker-compose logs api
docker-compose restart api
```

### Database Connection Issues
```bash
docker-compose exec db mysql -u user -ppassword -e "SHOW DATABASES;"
```

### MinIO Access Issues
```bash
docker-compose logs minio
# Check MinIO console at http://localhost:9001
```

### Frontend Can't Connect to Backend
- Check `.env` file has correct `VITE_API_URL`
- Verify API is running: `curl http://localhost:8000/health`
- Check CORS settings in `backend/app/main.py`

## 📚 Additional Resources

- [DuckDB Documentation](https://duckdb.org/docs/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [MinIO Documentation](https://min.io/docs/)
- [React Documentation](https://react.dev/)
