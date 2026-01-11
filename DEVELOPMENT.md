# Elevare Development Guide

## Service Architecture

Elevare consists of three main services that work together:

1. **Frontend (Next.js)** - Port 3000
   - User interface and client-side logic
   - Proxies API requests to backend and summarization services

2. **Backend (Node.js/Express)** - Port 3001  
   - Main API server for user data, notes, tasks, etc.
   - Database operations and business logic

3. **Summarization Service (Python/FastAPI)** - Port 8001
   - AI-powered text summarization using PEGASUS model
   - Handles text chunking, caching, and model inference

## Quick Start

### Option 1: Start All Services (Recommended)
```bash
# Install dependencies for all services
npm run install:all

# Start all services
npm start
# or
npm run dev
```

### Option 2: Start Services Individually
```bash
# Terminal 1: Start Summarization Service
cd summarization-service
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001

# Terminal 2: Start Backend
cd backend
npm install
npm run dev

# Terminal 3: Start Frontend  
cd frontend
npm install
npm run dev
```

## Service Dependencies

### Summarization Feature Dependencies
The AI summarization feature requires the **Summarization Service** to be running:

- ✅ **With Summarization Service**: Full functionality including AI summaries
- ⚠️ **Without Summarization Service**: App works but summarization returns 503 errors

### Core App Dependencies
The main application requires the **Backend Service**:

- ✅ **With Backend**: Full app functionality (notes, tasks, auth, etc.)
- ❌ **Without Backend**: Limited functionality, most features won't work

## Service Management

### Start Services
```bash
npm start              # Start all services
./scripts/start-services.sh  # Direct script execution
```

### Stop Services
```bash
npm stop               # Stop all services
./scripts/stop-services.sh   # Direct script execution
```

### Restart Services
```bash
npm restart            # Restart all services
```

### Check Service Status
```bash
npm run health         # Check all service health
curl http://localhost:8001/health  # Summarization service
curl http://localhost:3001/health  # Backend service  
curl http://localhost:3000/api/health  # Frontend service
```

### View Logs
```bash
npm run logs                    # All service logs
npm run logs:summarization     # Summarization service only
npm run logs:backend          # Backend service only
npm run logs:frontend         # Frontend service only
```

## Development Workflow

### 1. Initial Setup
```bash
git clone <repository>
cd elevare
npm run install:all
```

### 2. Daily Development
```bash
npm start              # Start all services
# Develop your features
npm stop               # Stop when done
```

### 3. Testing
```bash
npm test               # Run all tests
npm run test:e2e       # End-to-end tests
npm run test:performance  # Performance tests
```

## Troubleshooting

### Summarization Service Issues

**Problem**: 503 Service Unavailable for summarization
**Solution**: 
```bash
# Check if service is running
curl http://localhost:8001/health

# If not running, start it
cd summarization-service
source venv/bin/activate
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001
```

**Problem**: Model loading takes too long
**Solution**: The PEGASUS model is large (~500MB) and takes 1-2 minutes to load on first startup. This is normal.

**Problem**: Out of memory errors
**Solution**: 
- Ensure you have at least 4GB RAM available
- Close other applications
- Use smaller text inputs for testing

### Port Conflicts

**Problem**: Port already in use
**Solution**:
```bash
# Find what's using the port
lsof -i :3000  # or :3001, :8001

# Kill the process
kill -9 <PID>

# Or use the stop script
npm stop
```

### Service Startup Order

Services should start in this order:
1. Summarization Service (takes longest due to model loading)
2. Backend Service  
3. Frontend Service

The start script handles this automatically.

## Environment Configuration

### Summarization Service Environment Variables
```bash
# In summarization-service/.env
MODEL_NAME=google/pegasus-xsum
MAX_TOKENS=1024
CACHE_SIZE=100
ENVIRONMENT=development
```

### Backend Environment Variables  
```bash
# In backend/.env
NODE_ENV=development
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
```

### Frontend Environment Variables
```bash
# In frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SUMMARIZATION_SERVICE_URL=http://localhost:8001
```

## Performance Considerations

### Development Mode
- Services run with hot reload enabled
- Summarization model loads once and stays in memory
- Database connections are pooled

### Production Mode
- Use `npm run build` to create optimized builds
- Consider using Docker for deployment
- Monitor memory usage for the summarization service

## Common Development Tasks

### Adding New API Endpoints
1. Add route to `backend/src/routes/`
2. Add controller to `backend/src/controllers/`
3. Update frontend API client in `frontend/src/lib/api-client.ts`

### Modifying Summarization Logic
1. Update `summarization-service/app/main.py`
2. Add tests in `summarization-service/test_*.py`
3. Update optimization configs in `summarization-service/config/`

### Frontend Component Development
1. Add components to `frontend/src/components/`
2. Update pages in `frontend/src/app/`
3. Add tests in `frontend/src/components/__tests__/`

## Getting Help

### Service Logs
Check the logs directory for detailed error information:
- `logs/summarization.log`
- `logs/backend.log`
- `logs/frontend.log`

### Health Checks
Use health endpoints to diagnose issues:
- http://localhost:8001/system/health-detailed
- http://localhost:3001/health
- http://localhost:3000/api/health

### Performance Monitoring
```bash
npm run test:performance  # Run performance tests
python scripts/performance-monitor.py --mode monitor  # Live monitoring
```