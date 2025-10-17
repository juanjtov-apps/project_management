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

### RBAC System (Role-Based Access Control)
**Production-ready three-tier access control system with complete tenant isolation.**

#### Access Tiers:
1. **Root Admin**: Platform-wide access for system administrators
   - User ID '0' or specific whitelisted emails (chacjjlegacy@proesphera.com, admin@proesphere.com)
   - Can access all companies, users, and projects across the platform
   - Access to `/api/admin/*` endpoints for platform management

2. **Company Admin**: Company-scoped user management
   - Can manage users within their own company only
   - Can invite users, assign roles, suspend/activate accounts
   - Access to `/api/company-admin/*` endpoints
   - Cannot modify root admin users or users from other companies

3. **Regular Users**: Role-based permissions (admin, manager, crew, contractor, client)
   - Permissions determine available navigation and features
   - All data access filtered by company_id for tenant isolation

#### Backend Security (Python FastAPI):
- **Authentication**: Session-based authentication with `/api/auth/user` endpoint
- **Permission System**: Navigation permissions returned from auth endpoint
  - Permissions: dashboard, projects, tasks, photos, schedule, logs, projectHealth, crew, subs, rbacAdmin, clientPortal, clientPortalPayments
- **Tenant Isolation**: All endpoints enforce company_id scoping
  - Projects API: GET/POST/PATCH/DELETE with company validation
  - Tasks API: All CRUD operations with company filtering
  - Photos API: Upload, retrieval, and deletion with company checks
  - Root admin can bypass company restrictions
- **Admin Endpoints**:
  - `/api/admin/companies` - Platform-wide company management
  - `/api/admin/users` - Platform-wide user listing
  - `/api/admin/projects` - Platform-wide project access
  - `/api/admin/stats` - Platform statistics
  - `/api/company-admin/invite` - Invite users to company
  - `/api/company-admin/users/{id}/role` - Update user role (PUT with {"role": string})
  - `/api/company-admin/users/{id}/activate` - Activate user (sets is_active=true)
  - `/api/company-admin/users/{id}/suspend` - Suspend user (sets is_active=false)
- **User Management Features**:
  - Database: Users table includes `is_active` boolean column for activation status
  - Frontend: RBAC Admin page shows flat user list for company admins, collapsible by company for root admins
  - TypeScript: UserProfile interface supports both snake_case (backend) and camelCase (frontend compatibility) field names

#### Frontend Security (React):
- **Role-Based Navigation**: Sidebar automatically filters menu items based on user permissions
- **Route Protection**: ProtectedRoute component guards sensitive routes
  - Protected routes: /rbac, /rbac-admin, /client-portal, /crew, /subs
  - Automatic redirect to /dashboard for unauthorized access
- **Permission-Aware UI**: Components check permissions before rendering features

#### Security Features:
- **Cross-Company Protection**: Users cannot access data from other companies
- **Root Admin Bypass**: Root admins can access all data for platform management
- **Validation Layers**: 
  - Frontend: Route guards and UI permission checks
  - Backend: Endpoint authentication and company_id validation
- **Secure Invite Flow**: Temporary passwords not logged (secure email delivery to be implemented)

#### Role Capabilities:
- **Admin**: Full access to company features, RBAC management, client portal (including payments tab)
- **Manager**: Access to projects, tasks, client portal (excluding payments), crew management
- **Project Manager**: Same access as Manager - projects, tasks, client portal (excluding payments), crew management
- **Office Manager**: Same access as Manager - projects, tasks, client portal (excluding payments), crew management
- **Crew**: Access to assigned tasks, photos, basic project info
- **Contractor**: Limited to assigned tasks and relevant photos
- **Client**: Access to client portal for their projects only (excluding payments)

### Core System Features
- **Users**: Role-based access (crew, manager, admin) and comprehensive user management.
- **Projects**: Status tracking, progress monitoring, and CRUD operations.
- **Tasks**: Assignment, priority management, inline status updates, and visual indicators.
- **Project Logs**: Documentation for activities and issues with enhanced tag management system.
- **Photos**: Image documentation with unified photo gallery, comprehensive filtering by tags/projects/logs, and advanced search capabilities.
- **Schedule Changes**: System for schedule modifications with Timeline and Calendar views.
- **PM Notifications System**: Comprehensive notification system for project managers with:
  - **Bell Icon**: Always-visible bell icon in top navigation showing unread count with 15-second polling
  - **Notification Types**: Issue created and message posted notifications from client actions
  - **Deep Linking**: Automatic routing to correct project sections (Issues or Forum) when clicking notifications
  - **Mark as Read**: Individual and bulk mark-as-read functionality with optimistic UI updates
  - **Database Schema**: `client_portal.pm_notifications` and `client_portal.pm_notification_prefs` tables for notification storage and user preferences
  - **Test Endpoints**: Feature-flagged test endpoints (`/api/testnotify/issue`, `/api/testnotify/message`) for simulating client events
  - **API Endpoints**: `/api/pm-notifications` (list), `/api/pm-notifications/unread-count`, `/api/pm-notifications/{id}/read`, `/api/pm-notifications/read-all`
  - **Note**: Old client portal notifications tab (for notification preferences) has been removed and replaced with standalone PM notification system
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
  - **Payment System** (Comprehensive): Professional payment management system with:
    - **Payment Schedules**: Create and manage payment schedules per project with title and notes
    - **Installments**: Track individual payments with name, description, amount, currency, due dates, status (planned/payable/paid), and display ordering
    - **Next Milestone Tracking**: Exactly one installment per project can be flagged as the next milestone for clear payment progression
    - **Payment Documents**: Contractor-uploaded documents (proposals, statements, lien waivers) with integrated file upload UI
    - **Proof of Payment**: Either contractor or client can upload receipts (check photos, wire confirmations, ACH) with receipt type, reference numbers, payment dates, and integrated file upload
    - **File Upload Integration**: Direct object storage uploads with signed URLs, automatic file path extraction, and proper dialog state management to prevent stale file submissions
    - **Invoice Generation**: Automatic invoice creation when installments are marked as paid, with unique invoice numbers (format: INV-{projectShort}-{year}-{sequence})
    - **Real-time Totals**: Server-side calculation of total contract amount, total paid, total pending, and percent complete
    - **Audit Trail**: Complete event logging for status changes and key actions
    - **Database Schema**: New tables in `client_portal` schema: `payment_schedules`, `payment_installments`, `payment_documents`, `payment_receipts`, `invoices`, `payment_events` (file_id columns use TEXT type for flexibility)
    - All features enforce strict company scoping and role-based permissions (contractor/PM can create/edit, clients can upload receipts)
  - All features maintain strict company scoping and project access verification for multi-tenant security.
  - **Note**: The old notifications preferences tab has been removed from the client portal in favor of the standalone PM notifications system.

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