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
- **Project Logs**: Documentation for activities and issues with enhanced tag management system.
- **Photos**: Image documentation with unified photo gallery, comprehensive filtering by tags/projects/logs, and advanced search capabilities.
- **Schedule Changes**: System for schedule modifications with Timeline and Calendar views.
- **Notifications**: Real-time notification system.
- **Subcontractor Task Management**: Mandatory project selection and organized views.
- **Visual Project Health Assessment Tool**: Project health monitoring with health score rings, risk matrices, project health cards, and a comprehensive dashboard, including real-time health score calculation and risk assessment.
- **Advanced Tag Management**: Smart tag input system with dropdown suggestions, tag creation capabilities, visual badge management, and keyboard navigation support across Photos and Project Logs.
- **Photo-Log Integration**: Photos uploaded via Project Logs automatically appear in Photos tab with proper project association and consistent tagging.
- **Task Filtering & Company Scoping**: All tasks have proper `company_id` assignments, ensuring multi-tenant security where users only see tasks within their company scope.
- **Gallery Button Fixes**: Consistent visibility of List/Grid toggle and Gallery buttons across desktop and mobile views on Photos and Projects pages.
- **Client Portal**: Comprehensive collaboration module enabling project managers and clients to interact seamlessly with 5 core features:
  - **Issues Reporting**: Create and track project issues with up to 3 photo uploads, priority levels (Low/Medium/High/Critical), status tracking (Open/In Progress/Resolved/Closed), and threaded comments for discussion.
  - **Forum Messaging**: Simplified project-level messaging system with real-time updates, allowing stakeholders to communicate directly within project context.
  - **Material Lists** (Comprehensive Redesign): Area-based material organization system with:
    - **Material Areas**: Custom areas for organizing materials by house section (e.g., Foundation, Framing, Electrical)
    - **Collapsible Sections**: Each area displays as a collapsible section showing item count and total cost in the header
    - **Inline Item Management**: Add, edit, and delete material items directly within each area section
    - **Product Links**: URL validation with external link preview buttons for vendor product pages
    - **Real-time Search**: Filter materials across all areas by name, specification, or vendor
    - **Cost Calculations**: Automatic calculation of area totals and project-wide estimated costs
    - **Database Schema**: New `material_areas` and `material_items` tables in `client_portal` schema (additive migration, legacy materials table preserved)
    - All features maintain strict company scoping and project access verification
  - **Payment Installments**: Track payment schedules with installment amounts, due dates, status monitoring (Pending/Paid/Overdue), and file upload support for invoices/receipts.
  - **Notifications System**: Customizable notification preferences with type-based settings (Issues/Forum/Materials/Payments), enabling users to control their communication flow.
  - All features maintain strict company scoping and project access verification for multi-tenant security.

### Data Flow
- **Client-Server Communication**: Frontend requests via TanStack Query are handled by the Python FastAPI backend for all operations including authentication, data management, and file operations.
- **Photo Storage Architecture**: All photos are stored professionally in Google Cloud Storage using Replit's object storage service.

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