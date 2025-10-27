# Proesphere - Construction Project Management System

## Overview
Proesphere is a comprehensive construction project management application designed to streamline workflows, enhance collaboration, and improve oversight for construction projects. It provides tools for managing projects, tasks, crew members, photo documentation, project logs, and scheduling. The system aims to offer 360° project management, enabling users to build smarter, deliver on time, on budget, and with high quality.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **State Management**: TanStack Query for server state management
- **UI Components**: Radix UI components with shadcn/ui design system
- **Styling**: Tailwind CSS with a custom construction-themed color palette.
- **Branding**: Proesphere with a custom sphere-style logo and unified design system.
- **Key Features**: Tablet-optimized UI for Task Management, Projects, and Dashboard modules, including virtualization for lists, multi-select capabilities, and persistent filter states.
- **Critical Fix (Oct 2025)**: Resolved complete UI freeze in Work module by implementing synchronous dialog state management. All mutation handlers now close dialogs and reset forms BEFORE invalidating queries, eliminating focus trap issues and render loops.

### Backend
- **Primary Backend**: Python FastAPI (port 8000) for all API logic and database operations.
- **API Design**: RESTful API with automatic OpenAPI documentation.
- **Database Operations**: Direct PostgreSQL queries with `asyncpg` and a repository pattern.
- **RBAC System**: Comprehensive three-tier role-based access control with 26 permissions, 6 role templates, and multi-tenant architecture, including row-level security. Roles include Root Admin, Company Admin, and Regular Users (admin, project_manager, office_manager, subcontractor, client).

### Database
- **Database**: PostgreSQL with Neon serverless database.
- **ORM**: Drizzle ORM for type-safe database operations and schema management.

### Core System Features
- **Unified Work Module**: Combined Projects and Tasks interface with segmented control navigation at /work, /projects, and /tasks routes. All routes render the same WorkPage component with appropriate default segment.
- **Users**: Role-based access and management.
- **Projects**: Status tracking and CRUD operations.
- **Tasks**: Assignment, priority, and inline status updates.
- **Project Logs**: Documentation with enhanced tag management.
- **Photos**: Image documentation with unified gallery, filtering, and search.
- **Schedule Changes**: Timeline and Calendar views for modifications.
- **PM Notifications**: Real-time notifications for project managers with deep linking and read management.
- **Subcontractor Task Management**: Project selection and organized views.
- **Visual Project Health Assessment**: Health scores, risk matrices, and dashboard.
- **Advanced Tag Management**: Smart input system with suggestions and visual badges.
- **Photo-Log Integration**: Automatic photo association from logs to gallery.
- **Client Portal**: Collaboration module with:
    - **Issues Reporting**: Tracking with photo uploads, priority, status, and comments.
    - **Forum Messaging**: Project-level communication.
    - **Material Lists**: Area-based material organization with cost calculations and product links.
    - **Payment System**: Payment schedules, installments, document uploads, proof of payment, and invoice generation.

## External Dependencies

- **@tanstack/react-query**: Server state management.
- **drizzle-orm**: Type-safe ORM.
- **@neondatabase/serverless**: PostgreSQL connection.
- **@radix-ui/***: UI component primitives.
- **tailwindcss**: CSS framework.
- **lucide-react**: Icon library.
- **date-fns**: Date manipulation.
- **Google Cloud Storage**: For photo storage via Replit's object storage.