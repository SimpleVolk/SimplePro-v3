# SimplePro-v3 Quick Start Guide

**Status:** All security fixes applied ✅ | Docker infrastructure running ✅

## Prerequisites Checklist

- [x] Node.js >= 20.0.0 installed
- [x] npm >= 10.0.0 installed
- [x] Docker Desktop running
- [x] Git installed

## Step 1: Start Docker Infrastructure

The development infrastructure (MongoDB, Redis, MinIO) is **already running** ✅

To verify:
```bash
docker ps
```

You should see 3 healthy containers:
- `simplepro-mongodb` (Port 27017)
- `simplepro-redis` (Internal)
- `simplepro-minio` (Ports 9000, 9001)

If containers are not running:
```bash
npm run docker:dev
```

## Step 2: Configure Environment

**Option A: Use Default Development Settings**

The system is pre-configured for development. No changes needed!

**Option B: Customize Settings (Optional)**

```bash
# Copy example environment file
cp .env.example .env.local

# Edit with your preferred editor
code .env.local  # or notepad .env.local on Windows
```

## Step 3: Install Dependencies

Dependencies are **already installed** ✅

If you need to reinstall:
```bash
npm install --legacy-peer-deps
```

## Step 4: Start Development Servers

**Option A: Start Both API and Web (Recommended)**
```bash
npm run dev
```
This starts:
- API Server: `http://localhost:3001`
- Web Dashboard: `http://localhost:3009`

**Option B: Start Services Individually**
```bash
# Terminal 1 - API Server
npm run dev:api

# Terminal 2 - Web Dashboard
npm run dev:web
```

## Step 5: Access the Application

### Web Dashboard
**URL:** http://localhost:3009

**Default Admin Credentials:**
- **Username:** `admin`
- **Email:** `admin@simplepro.com`
- **Password:** Check `D:\Claude\SimplePro-v3\.secrets\admin-password.txt`

> ⚠️ **Security Note:** The password is stored securely in the `.secrets` directory and will NOT appear in console logs.

### API Documentation
- **Swagger UI:** http://localhost:3001/api/docs (if enabled)
- **Health Check:** http://localhost:3001/api/health

## Step 6: Verify Everything Works

### Test API Health
```bash
curl http://localhost:3001/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-10-02T...",
  "environment": "development"
}
```

### Test MongoDB Connection
Check API logs - you should see:
```
[DatabaseModule] Connected to MongoDB successfully
```

### Test Authentication
1. Open http://localhost:3009
2. Click "Login"
3. Use admin credentials from `.secrets/admin-password.txt`
4. You should see the dashboard

## Common Commands

### Development
```bash
npm run dev              # Start both API and Web
npm run dev:api          # API only (port 3001)
npm run dev:web          # Web only (port 3009)
```

### Testing
```bash
npm test                 # Run all tests
npm run test:api         # API tests only
npm run test:web         # Web tests only
npm run test:pricing     # Pricing engine tests (38 tests)
npm run test:coverage    # All tests with coverage
```

### Building
```bash
npm run build            # Build all projects
nx build api             # Build API only
nx build web             # Build web only
```

### Docker Management
```bash
npm run docker:dev       # Start infrastructure
npm run docker:dev:down  # Stop infrastructure
npm run docker:dev:logs  # View logs
docker ps                # Check status
```

### Database Operations
```bash
npm run db:seed          # Seed database (when available)
npm run db:migrate       # Run migrations (when available)
```

## Troubleshooting

### Port Already in Use

**Error:** `Port 3001 is already in use`

**Solution:**
```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:3001 | xargs kill -9
```

### MongoDB Connection Failed

**Error:** `MongoServerError: Authentication failed`

**Solution:**
```bash
# Restart MongoDB container
npm run docker:dev:down
npm run docker:dev

# Verify MongoDB is healthy
docker ps
```

### Cannot Find Admin Password

**Location:** `D:\Claude\SimplePro-v3\.secrets\admin-password.txt`

**If file doesn't exist:**
1. Stop the API server
2. Delete the admin user from MongoDB (or reset database)
3. Restart API - it will recreate the admin user and password file

### Build Failures

**Error:** TypeScript or dependency errors

**Solution:**
```bash
# Clean everything and reinstall
npm run clean
npm install --legacy-peer-deps
npm run build
```

## Security Features Enabled

✅ **Rate Limiting:** 5 login attempts per minute
✅ **NoSQL Injection Protection:** All queries sanitized
✅ **Secure Password Storage:** No passwords in logs
✅ **JWT Authentication:** Access & refresh tokens
✅ **RBAC:** Role-based access control
✅ **CORS Protection:** Configured origins only
✅ **Audit Logging:** All actions tracked

## Next Steps

1. **Explore the Dashboard:**
   - View customers, jobs, and analytics
   - Create test data
   - Test estimate calculator

2. **Review API Endpoints:**
   - Check Swagger docs at `/api/docs`
   - Test authentication flows
   - Explore customer/job management

3. **Run Tests:**
   ```bash
   npm run test:coverage
   ```

4. **Read Documentation:**
   - `SECURITY_FIXES_REPORT.md` - Security improvements
   - `CLAUDE.md` - Project architecture
   - `TEST_COVERAGE_ANALYSIS.md` - Testing strategy

## Support

**Common Issues:**
- MongoDB connection: Check Docker containers are running
- Authentication errors: Verify credentials in `.secrets/admin-password.txt`
- Port conflicts: Kill existing Node processes

**Useful Links:**
- Project Documentation: See `CLAUDE.md`
- Security Report: See `SECURITY_FIXES_REPORT.md`
- API Reference: http://localhost:3001/api/docs

---

**Quick Start Complete! 🚀**

Your SimplePro-v3 system is now:
- ✅ Secure (all critical vulnerabilities fixed)
- ✅ Running (Docker infrastructure operational)
- ✅ Ready for development

Happy coding! 💻
