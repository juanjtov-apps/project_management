# Quick Setup Checklist

Use this checklist to ensure everything is set up correctly for local development.

## ✅ Prerequisites Check

- [ ] Node.js installed (`node --version` should be 18+)
- [ ] Python installed (`python --version` should be 3.8+)
- [ ] npm installed (`npm --version`)
- [ ] Database connection configured (Cloud SQL or Neon)

## ✅ Dependencies

- [ ] Node.js dependencies installed: `npm install`
- [ ] Python dependencies installed: `cd python_backend && pip install -r requirements.txt`
- [ ] Virtual environment created (optional but recommended): `python -m venv python_backend/venv`

## ✅ Environment Variables

Set these in your shell or `.env` file:

- [ ] `DATABASE_URL` - PostgreSQL connection string
- [ ] `DB_SSL_DIR` - Path to SSL certificates (for Cloud SQL)
- [ ] `SESSION_SECRET` - Random secret for session encryption
- [ ] `NODE_ENV=development` - Development mode
- [ ] `PORT=5000` - Node.js server port (optional, defaults to 5000)

### Generate SESSION_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## ✅ Database Connection Tests

- [ ] Python backend connection test passes: `cd python_backend && python test_db_connection.py`
- [ ] Node.js connection test passes: `npm run test:db`

## ✅ Start the Application

### Option 1: Both servers together
```bash
./start-both-servers.sh
```

### Option 2: Separate terminals
**Terminal 1:**
```bash
cd python_backend
python main.py
```

**Terminal 2:**
```bash
npm run dev
```

## ✅ Verify Everything Works

- [ ] Python backend health check: http://localhost:8000/health
- [ ] Python API docs: http://localhost:8000/docs
- [ ] Node.js backend status: http://localhost:5000/api/backend-status
- [ ] Frontend loads: http://localhost:5000
- [ ] No errors in browser console
- [ ] No errors in server logs

## 🎯 You're Ready!

Once all checks pass, you can:
- Access the frontend at http://localhost:5000
- Test API endpoints at http://localhost:8000/docs
- Start developing!

## 📚 Need Help?

See `LOCAL_SETUP.md` for detailed setup instructions and troubleshooting.

