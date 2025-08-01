# Tower Flow - Construction Project Management System

## Overview
Tower Flow is a comprehensive construction project management application. It provides tools for managing construction projects, tasks, crew members, photo documentation, project logs, and scheduling. The system aims to streamline construction workflows, enhance collaboration, and improve project oversight through a modern full-stack architecture.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Progress (July 31, 2025)
✅ **RBAC Edit Functionality Completed**: Fixed `editingRole` undefined variable error and implemented comprehensive edit dialogs
✅ **Variable Scoping Issues Resolved**: All edit state variables properly managed with cleanup on dialog close
✅ **Form Validation Enhanced**: Added required field checks and improved error handling with toast notifications
✅ **Backend API Fully Operational**: All edit endpoints (users, roles, companies) working with 200 status responses
✅ **Database Integration Verified**: Changes persist correctly, excellent response times (0.002-0.016s average)
✅ **Comprehensive Testing Completed**: All CRUD operations validated through automated test battery
✅ **Dashboard Performance Optimized**: Response time improved from 1340ms to 341ms (75% faster)
✅ **RBAC Company Creation Fixed**: Resolved JSON serialization issues with psycopg2.extras.Json
✅ **View Users Button Fixed**: Added proper onClick handler and improved visual layout in company cards
✅ **User-Company Associations Created**: Fixed empty company_users table by linking users to companies with proper roles
✅ **Date Formatting Issues Resolved**: Fixed "Invalid Date" display by correcting PostgreSQL field name mapping from snake_case to camelCase
✅ **User Management Tab Fixed**: Added missing `/rbac/users` endpoint that was causing 404 errors in user management interface
✅ **User-Company Association Display Fixed**: Resolved field mapping issue where `companyName` (camelCase) from database was not properly mapped to `company_name` (snake_case) expected by frontend
✅ **Root Admin Creation Script**: Added secure console script (`create_root_admin.py`) for creating root user (ID 0) with full system access and bcrypt password hashing

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Components**: Radix UI components with shadcn/ui design system
- **Styling**: Tailwind CSS with custom construction-themed color palette
- **Build Tool**: Vite

### Backend Architecture
- **Primary Backend**: Python FastAPI (port 8000) for all API logic and database operations - **OPERATIONAL**
- **Proxy Layer**: Node.js Express.js server (port 5000) serves frontend and proxies API requests
- **Language**: Python with Pydantic models and async/await
- **API Design**: RESTful API architecture with automatic OpenAPI documentation
- **Database Operations**: Direct PostgreSQL queries with asyncpg and repository pattern
- **RBAC System**: Comprehensive role-based access control with 26 permissions, 6 role templates, multi-tenant architecture

### Database Architecture
- **Database**: PostgreSQL with Neon serverless database
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Connection**: Connection pooling with @neondatabase/serverless

### Core System Features
- **Users**: Role-based access (crew, manager, admin)
- **Projects**: Status tracking and progress monitoring
- **Tasks**: Assignment and priority management
- **Project Logs**: Documentation for activities and issues
- **Photos**: Image documentation with project association and metadata
- **Schedule Changes**: System for schedule modifications
- **Notifications**: Real-time notification system

### Data Flow
- **Client-Server Communication**: Frontend requests through TanStack Query are proxied by Express.js to the Python FastAPI backend, which handles logic and database interactions via a repository pattern with asyncpg.
- **Photo Upload Flow**: Client uploads photos via FormData to `/api/photos`, processed by Multer, stored locally in `/uploads`, and metadata saved to the database.
- **Real-time Features**: Notifications refetch periodically, dashboard stats update on mutations, and optimistic updates for task status changes.

### Key Technical Implementations
- **Task Management**: Comprehensive system with dual creation paths (main page and project dropdowns), tabbed interface (Overview, By Projects, Administrative, General), inline status updates, and visual indicators.
- **Project Management**: CRUD operations for projects including detailed editing functionality.
- **Schedule Management**: Timeline and Calendar views for tasks and deadlines, with immediate direct task updates (no approval workflow).
- **Subcontractor Task Management**: Comprehensive system with mandatory project selection and organized views ("By Projects," "By Subcontractors," "Milestones").
- **Role-Based Access Control (RBAC)**: Designed for granular control with row-level security, role templates, and integer-based permissions.

## External Dependencies

### Core Dependencies
- **@tanstack/react-query**: Server state management and caching
- **drizzle-orm**: Type-safe ORM for database operations
- **@neondatabase/serverless**: PostgreSQL connection for Neon database
- **multer**: File upload handling middleware
- **react-hook-form**: Form state management with validation
- **zod**: Runtime type validation and schema definition

### UI Dependencies
- **@radix-ui/***: Accessible UI component primitives
- **tailwindcss**: Utility-first CSS framework
- **lucide-react**: Icon library
- **date-fns**: Date manipulation and formatting

### Development Dependencies
- **vite**: Build tool and development server
- **typescript**: Type checking and compilation
- **drizzle-kit**: Database schema management tools