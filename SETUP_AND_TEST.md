# Proesphere Setup and Testing Guide

## Quick Start

This guide will help you set up and test the Proesphere Construction Management System from a fresh repository clone.

## Prerequisites

- Node.js (version 18+)
- Python (version 3.10+)
- PostgreSQL database access

## 1. Initial Setup

```bash
# Clone and enter the repository
git clone <repository-url>
cd proesphere

# Install dependencies (automatically installs both frontend and backend packages)
npm install

# Start the application
npm run dev
```

The application will start with:
- **Frontend**: http://localhost:5000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## 2. Testing the System

### Option A: Quick Web Interface Test

1. Open http://localhost:5000 in your browser
2. Login with test credentials:
   - **Email**: `daniel@tiento.com`
   - **Password**: `password123`
3. Verify all navigation tabs are visible:
   - Dashboard, Projects, Tasks, Project Health, Schedule, Photos, Project Logs, Crew, Subs, RBAC Admin
4. Test task assignment dropdowns show email addresses instead of "Unknown User"

### Option B: Automated API Testing

Run the comprehensive test battery to verify all endpoints:

```bash
# Simple bash test (requires browser login first)
chmod +x simple_test_endpoints.sh
./simple_test_endpoints.sh

# Comprehensive Python test (handles authentication)
python test_api_endpoints.py
```

Expected output: **✅ ALL TESTS PASSED!**

## 3. What the Tests Verify

### Core Functionality
- ✅ User authentication and session management
- ✅ Dashboard statistics and recent activities
- ✅ Project, task, and photo management
- ✅ User management and role-based permissions
- ✅ Schedule changes and notifications

### Technical Verification
- ✅ FastAPI backend migration from Node.js
- ✅ Database connections and queries
- ✅ Frontend-backend communication
- ✅ Permission-based access control
- ✅ Error handling and validation

## 4. Architecture Overview

### Backend (Python FastAPI)
- **Port**: 8000
- **Database**: PostgreSQL with asyncpg
- **Authentication**: Session-based with bcrypt
- **API Documentation**: Auto-generated OpenAPI at `/docs`

### Frontend (React + TypeScript)
- **Port**: 5000
- **Framework**: React 18 with Vite
- **State Management**: TanStack Query
- **UI Components**: Radix UI + shadcn/ui
- **Routing**: Wouter

### Database
- **Type**: PostgreSQL (Neon serverless)
- **ORM**: Drizzle ORM
- **Migrations**: `npm run db:push`

## 5. Common Issues and Solutions

### "Navigation tabs not showing"
- **Cause**: Permission mapping mismatch
- **Solution**: Already fixed - frontend now correctly maps backend permissions

### "Unknown User in dropdowns"
- **Cause**: Missing user name display logic
- **Solution**: Already fixed - now shows email addresses when names are null

### "Activities endpoint 404"
- **Cause**: Missing endpoint implementation
- **Solution**: Already fixed - endpoint created with proper SQL queries

### "Database connection errors"
- **Verification**: Run test scripts to confirm all endpoints return 200 OK

## 6. Development Commands

```bash
# Start development server
npm run dev

# Database operations
npm run db:push          # Push schema changes
npm run db:generate      # Generate migrations

# Testing
python test_api_endpoints.py    # Full API test suite
./simple_test_endpoints.sh      # Quick endpoint verification

# Build for production
npm run build
```

## 7. Success Criteria

The system is working correctly when:

1. **Frontend loads without errors** - All navigation tabs visible
2. **Authentication works** - Can login and access protected routes  
3. **API endpoints respond** - All return 200 OK status codes
4. **Database operations work** - Data loads and updates properly
5. **Permissions function** - Role-based access control working
6. **Test battery passes** - 100% success rate on automated tests

## 8. Support

If you encounter issues:

1. **Check the test scripts** - They'll identify which component is failing
2. **Review the logs** - Both frontend (browser console) and backend (terminal)
3. **Verify database connection** - Ensure DATABASE_URL is properly set
4. **Confirm dependencies** - Run `npm install` to ensure all packages are installed

---

**✅ The Proesphere system is ready for development and deployment!**