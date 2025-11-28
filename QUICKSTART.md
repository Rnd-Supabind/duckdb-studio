# DataForge - Quick Start Guide

## 🚀 Running the Application

### Option 1: Development Mode (Recommended for Testing)

The frontend runs separately from Docker for faster development:

```bash
# 1. Start backend services (MySQL, MinIO, API)
docker-compose up -d

# 2. Start frontend (in a separate terminal)
npm install
npm run dev

# Frontend will be available at: http://localhost:5173
# Backend API at: http://localhost:8000
```

### Option 2: Full Docker Stack (Production)

To run everything in Docker (including frontend):

```bash
# Coming soon - frontend Docker container
# For now, use Option 1
```

## 📍 Access Points

| Service | URL | Credentials |
|---------|-----|-------------|
| **Frontend (Dev)** | http://localhost:5173 | admin/admin123 |
| **Backend API** | http://localhost:8000/docs | - |
| **phpMyAdmin** | http://localhost:8080 | user/password |
| **MinIO Console** | http://localhost:9001 | minioadmin/minioadmin |

## ✨ New Features

### 1. **Browser vs Server Execution**
Toggle between client-side (WASM) and server-side (CLI) query execution:
- **Browser Mode**: Fast, private, runs in your browser
- **Server Mode**: Heavy queries, MySQL/PostgreSQL extensions

### 2. **Sample Data**
Load pre-built datasets instantly:
- Sales Data (1000 rows)
- Customer Data (500 rows)
- Product Inventory (100 rows)

### 3. **Backend API Integration**
All features now support backend processing:
- Query execution with performance metrics
- Workflow management
- Storage configuration
- Audit logging

## 🎯 Quick Test

```bash
# 1. Open http://localhost:5173
# 2. Login with: admin / admin123
# 3. Go to "Data View"
# 4. Click "Sample Data" → Load "Sales Data"
# 5. Go to "Query Editor"
# 6. Toggle to "Server" mode
# 7. Run: SELECT product, SUM(quantity * price) as revenue FROM sales GROUP BY product;
```

## 🔧 Troubleshooting

### Frontend not connecting to backend?
Check `.env` file:
```bash
VITE_API_URL=http://localhost:8000/api/v1
```

### Backend not responding?
```bash
docker-compose ps
docker-compose logs api
```

### Need to reset everything?
```bash
docker-compose down -v
docker-compose up -d
docker-compose exec api python -m app.db.init_db
docker-compose exec api python -m app.db.seed
```

## 📊 What's Working

✅ Frontend running on `npm run dev` (Port 5173)  
✅ Backend API in Docker (Port 8000)  
✅ MySQL Database with seed data  
✅ MinIO object storage  
✅ Browser ↔ Server execution toggle  
✅ Sample data loader  
✅ Audit logging  
✅ Workflow management  

---

**Status**: All systems operational! 🎉
