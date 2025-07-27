# ContractorPro - Construction Project Management System

## Overview

ContractorPro is a comprehensive construction project management application built with a modern full-stack architecture. The system provides tools for managing construction projects, tasks, crew members, photo documentation, project logs, and scheduling. It features a React-based frontend with TypeScript, an Express.js backend, and PostgreSQL database with Drizzle ORM.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Components**: Radix UI components with shadcn/ui design system
- **Styling**: Tailwind CSS with custom construction-themed color palette
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API architecture
- **File Uploads**: Multer middleware for handling photo uploads
- **Error Handling**: Centralized error handling middleware

### Database Architecture
- **Database**: PostgreSQL with Neon serverless database
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Connection**: Connection pooling with @neondatabase/serverless

## Key Components

### Core Entities
1. **Users**: Crew members with role-based access (crew, manager, admin)
2. **Projects**: Construction projects with status tracking and progress monitoring
3. **Tasks**: Project-specific tasks with assignment and priority management
4. **Project Logs**: Documentation entries for project activities and issues
5. **Photos**: Image documentation with project association and metadata
6. **Schedule Changes**: Request system for schedule modifications
7. **Notifications**: Real-time notification system for updates

### Frontend Components
- **Dashboard**: Overview with stats, recent activity, and quick actions
- **Project Management**: CRUD operations for construction projects
- **Task Management**: Kanban-style task board with status tracking
- **Photo Gallery**: Upload, view, and manage construction photos
- **Crew Management**: Team member assignment and schedule changes
- **Notification System**: Real-time updates with read/unread status

### Backend Services
- **Storage Layer**: Abstracted storage interface for data operations
- **File Handling**: Photo upload and retrieval with file system storage
- **API Routes**: RESTful endpoints for all major entities
- **Session Management**: User session handling (infrastructure prepared)

## Data Flow

### Client-Server Communication
1. Frontend makes API requests through TanStack Query
2. Express.js routes handle HTTP requests with validation
3. Storage layer abstracts database operations
4. Drizzle ORM provides type-safe database queries
5. Response data flows back through the same chain

### Photo Upload Flow
1. Client selects images through file input
2. FormData with photos sent to `/api/photos` endpoint
3. Multer middleware processes multipart uploads
4. Files stored in `/uploads` directory
5. Metadata saved to database with file references

### Real-time Features
- Notifications refetch every 30 seconds
- Dashboard stats update on successful mutations
- Optimistic updates for task status changes

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
- **lucide-react**: Icon library for consistent iconography
- **date-fns**: Date manipulation and formatting

### Development Dependencies
- **vite**: Build tool and development server
- **typescript**: Type checking and compilation
- **drizzle-kit**: Database schema management tools

## Deployment Strategy

### Build Process
1. **Frontend Build**: Vite builds React app to `dist/public`
2. **Backend Build**: esbuild bundles server code to `dist/index.js`
3. **Database Migration**: Drizzle Kit handles schema deployment

### Environment Configuration
- **Development**: Uses Vite dev server with Express API proxy
- **Production**: Serves static files from Express with built frontend
- **Database**: Requires `DATABASE_URL` environment variable

### File Structure
```
├── client/          # React frontend application
├── server/          # Express.js backend
├── shared/          # Shared TypeScript types and schemas
├── uploads/         # File storage for uploaded photos
├── migrations/      # Database migration files
└── dist/           # Production build output
```

### Scaling Considerations
- File uploads currently use local filesystem storage
- Database connection pooling through Neon serverless
- Session management infrastructure prepared for authentication
- Component architecture supports feature expansion

The system is designed to be easily maintainable and scalable, with clear separation between frontend, backend, and database layers. The use of TypeScript throughout ensures type safety, while the modern tooling provides excellent developer experience.