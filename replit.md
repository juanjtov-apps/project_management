# Proesphere - Construction Project Management System

## Overview
Proesphere is a comprehensive construction project management application designed to streamline workflows, enhance collaboration, and improve oversight for construction projects. It provides tools for managing projects, tasks, crew members, photo documentation, project logs, and scheduling. The system aims to offer 360° project management, enabling users to build smarter, deliver on time, on budget, and with high quality.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Components**: Radix UI components with shadcn/ui design system
- **Styling**: Tailwind CSS with a custom construction-themed color palette (Deep Space Blue, Sphere Teal, Spark Coral, Cloud White, Mist Grey, Graphite Ink)
- **Branding**: Rebranded to Proesphere with a custom sphere-style logo, updated landing page copy, and a unified design system with Teal icons and professional interaction states.
- **Build Tool**: Vite

### Backend Architecture
- **Primary Backend**: Python FastAPI (port 8000) for all API logic and database operations.
- **Proxy Layer**: Node.js Express.js server (port 5000) serves the frontend and proxies API requests.
- **Language**: Python with Pydantic models and async/await.
- **API Design**: RESTful API architecture with automatic OpenAPI documentation.
- **Database Operations**: Direct PostgreSQL queries with asyncpg and a repository pattern.
- **RBAC System**: Comprehensive role-based access control with 26 permissions, 6 role templates, and a multi-tenant architecture, including row-level security and integer-based permissions.

### Database Architecture
- **Database**: PostgreSQL with Neon serverless database.
- **ORM**: Drizzle ORM for type-safe database operations.
- **Schema Management**: Drizzle Kit for migrations and schema management.
- **Connection**: Connection pooling with `@neondatabase/serverless`.

### Core System Features
- **Users**: Role-based access (crew, manager, admin) and comprehensive user management.
- **Projects**: Status tracking, progress monitoring, and CRUD operations.
- **Tasks**: Assignment, priority management, inline status updates, and visual indicators.
- **Project Logs**: Documentation for activities and issues.
- **Photos**: Image documentation with project association and metadata.
- **Schedule Changes**: System for schedule modifications with Timeline and Calendar views.
- **Notifications**: Real-time notification system.
- **Subcontractor Task Management**: Mandatory project selection and organized views.
- **Visual Project Health Assessment Tool**: Project health monitoring with health score rings, risk matrices, project health cards, and a comprehensive dashboard, including real-time health score calculation and risk assessment.

### Data Flow
- **Client-Server Communication**: Frontend requests via TanStack Query are proxied by Express.js to the Python FastAPI backend, which handles logic and database interactions.
- **Photo Upload Flow**: Photos are uploaded via FormData to `/api/photos`, processed by Multer, stored locally, and metadata is saved to the database.

## External Dependencies

### Core Dependencies
- **@tanstack/react-query**: Server state management and caching.
- **drizzle-orm**: Type-safe ORM for database operations.
- **@neondatabase/serverless**: PostgreSQL connection for Neon database.
- **multer**: File upload handling middleware.
- **react-hook-form**: Form state management with validation.
- **zod**: Runtime type validation and schema definition.

### UI Dependencies
- **@radix-ui/***: Accessible UI component primitives.
- **tailwindcss**: Utility-first CSS framework.
- **lucide-react**: Icon library.
- **date-fns**: Date manipulation and formatting.