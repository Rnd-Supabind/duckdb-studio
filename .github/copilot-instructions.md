# DataForge AI Coding Instructions

## Architecture Overview

**DataForge** is a full-stack SOC-aligned ETL platform with dual execution modes:
- **Frontend** (React + TypeScript): Browser-based DuckDB WASM for privacy-first processing
- **Backend** (FastAPI + Python): Server-side DuckDB CLI for heavy workloads
- **Infra** (Docker Compose): MySQL (metadata), MinIO (S3-compatible storage), phpMyAdmin

**Key Pattern**: Execution mode context (`ExecutionModeContext`) determines whether queries run client-side (WASM) or server-side (API). This is a critical architectural decision that affects performance, security, and data residency.

## Frontend Architecture (`src/`)

### Context Providers (Global State)
- **AuthContext**: Manages user auth state, login/logout, token storage
- **DuckDBContext**: Wraps `useDuckDB` hook for WASM instance access
- **ExecutionModeContext**: Toggles between `client` (WASM) and `server` (API) modes
- **ThemeContext**: Dark/light theme persistence to localStorage

**Pattern**: All contexts follow the same structure: create context, wrap hook/state, export `use{Context}` hook. Throw error if hook used outside provider.

### API Client (`src/lib/api.ts`)
- Single `apiClient` object with methods for all endpoints
- Auth headers auto-attached via `withAuthHeaders()` helper
- Base URL from `VITE_API_URL` env var, defaults to `http://localhost:8000/api/v1`
- Response error handling returns error details from backend

### Query Execution (`src/hooks/useDuckDB.ts`)
- Initializes WASM DuckDB once on mount via `useRef` to prevent re-initialization
- Returns `{ db, loading, error, executeQuery, executeFile }`
- Server-mode queries call `/api/v1/execute/run` endpoint instead
- Query results: `{ columns: string[], rows: any[][], executionTime: number }`

### Pages & Components
- Pages in `src/pages/` map to routes defined in `App.tsx`
- Layout via `AppLayout` + `AppSidebar` + `AppTopNav` (collapsible sidebar)
- UI components from Shadcn (prebuilt Radix-based components in `src/components/ui/`)
- Data components: `DataGrid` (sorting/filtering/pagination), `FileUploader`, `TableSelector`

## Backend Architecture (`backend/app/`)

### Core Structure
- **API Router** (`api/router.py`): Mounts sub-routers for auth, execute, workflows, storage, audit, admin
- **Models** (`models/models.py`): SQLAlchemy ORM for User, Workflow, WorkflowExecution, AuditLog, StorageConfig
- **Security** (`core/security.py`): Fernet encryption (sensitive data), JWT tokens, SQL injection validation
- **Config** (`core/config.py`): Settings via Pydantic (DATABASE_URL, MINIO_*, SECRET_KEY, etc.)

### Database Pattern
- MySQL via SQLAlchemy + pymysql driver
- All tables auto-created by `init_db()` on startup
- Relationships: User → Workflows, Workflows → WorkflowExecutions, User → AuditLogs
- Init script: `docker-compose exec api python -m app.db.init_db`

### API Endpoints (`/api/v1/`)
- `/auth/login`, `/auth/signup`: JWT token generation
- `/execute/run`: POST with `{ query, extensions[], use_cli }` → QueryResponse
- `/workflows/`: CRUD for scheduled/manual workflows
- `/storage/`: S3/MinIO config management (encrypted storage)
- `/audit/`: Immutable audit log query
- `/admin/users`, `/admin/plans`: Admin-only endpoints

### Query Execution (`execute.py`)
- **Server-mode flow**: Validate query → Log action → Execute via DuckDB CLI → Return results
- **Security**: `validate_sql_query()` blocks DROP, DELETE, truncate patterns
- **Per-user databases**: Persistent `/data/user_{id}.duckdb` files for data isolation
- **MinIO integration**: Configure S3 credentials in DuckDB before query execution

### Audit Logging (`core/audit.py`)
- Immutable append-only log: all user actions tracked
- Fields: user_id, action, resource_type, resource_id, details, ip_address, user_agent, timestamp
- Query audits truncate SQL to first 500 chars for storage efficiency

## Developer Workflows

### Local Development
```bash
# Backend + infra only (no frontend rebuild)
docker-compose up -d --build

# Initialize fresh database
docker-compose exec api python -m app.db.init_db

# Frontend dev (watches src/ changes)
npm install && npm run dev  # Runs on :5173

# View API docs
open http://localhost:8000/docs
```

### Database Debugging
- **phpMyAdmin**: http://localhost:8080 (user:password)
- **MinIO Console**: http://localhost:9001 (minioadmin:minioadmin)
- **MySQL shell**: `docker-compose exec db mysql -u user -p dataforge`

### Adding a New API Endpoint
1. Create handler in `backend/app/api/{resource}.py` with `@router.post()` decorator
2. Import and mount in `api/router.py`: `api_router.include_router({resource}.router, prefix="/{resource}")`
3. Add audit logging via `await log_action(db, user_id, action, ...)`
4. Add endpoint test: call from frontend and verify in `/docs`

### Adding a Database Model
1. Define in `models/models.py` with SQLAlchemy Base inheritance
2. Add relationships (`relationship()`) to related models
3. Run migration: `docker-compose exec api python -m app.db.init_db` (creates table)
4. Update API endpoints to use new fields

## Project-Specific Patterns

### Execution Mode Toggle
Default mode is inferred from query complexity or user preference. Always check `useExecutionMode()` before running queries—don't hardcode to WASM or server.

### Error Handling
- Frontend: Try-catch with user-friendly toast notifications
- Backend: Return HTTPException with descriptive `detail` string; frontend extracts `error.response.json().detail`

### Authentication
- Frontend stores JWT in localStorage; auto-included in all API calls
- Backend validates token via `Depends(get_current_user)` on protected routes
- Session timeout: 7 days (set in `config.py`)

### Encryption
- Sensitive data (API keys, passwords): Encrypt before DB storage via `encrypt_value()`
- Decrypt on retrieval via `decrypt_value()` (Fernet cipher)
- ENCRYPTION_KEY env var required; auto-generates for dev (log warning)

### File & Storage Handling
- Uploaded files go to MinIO bucket `user-{username}`
- Query results from `/execute/run` include row count and execution time
- Persistent user databases at `/data/user_{id}.duckdb` survive container restarts

## Common Tasks

**Running a workflow**: POST to `/api/v1/workflows/{id}/execute` → triggers async job, returns execution_id
**Checking query results**: Frontend caches via React Query (TanStack)
**Audit compliance**: Query `/api/v1/audit/logs` with filters (user_id, action, date range)
**User quota enforcement**: Stored in `user_quota` table; check before large uploads

## Key Dependencies & Versions
- Frontend: React 18, Vite, TypeScript 5, DuckDB WASM 1.30, Shadcn UI
- Backend: FastAPI 0.109, SQLAlchemy 2.0, DuckDB 0.9.2, MinIO 7.2, MySQL 8.0
- Docker base: Python 3.11 (backend), Node 18+ (frontend)

## Environment Variables

**Frontend** (`VITE_*` prefix, see `.env`):
- `VITE_API_URL`: Backend API base (default: http://localhost:8000/api/v1)

**Backend** (`.env` or docker-compose):
- `DATABASE_URL`: MySQL connection string
- `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`
- `SECRET_KEY`, `ENCRYPTION_KEY`: For JWT and Fernet cipher
- `DUCKDB_EXTENSIONS`: Comma-separated (mysql, postgres, httpfs, aws)
