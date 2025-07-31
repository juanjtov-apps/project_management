# Tower Flow - Construction Project Management System

## Overview

Tower Flow is a comprehensive construction project management application built with a modern full-stack architecture. The system provides tools for managing construction projects, tasks, crew members, photo documentation, project logs, and scheduling. It features a React-based frontend with TypeScript, an Express.js backend, and PostgreSQL database with Drizzle ORM.

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
- **Primary Backend**: Python FastAPI (port 8000) - handles all API logic and database operations
- **Proxy Layer**: Node.js Express.js server (port 5000) - serves frontend and proxies API requests
- **Language**: Python with Pydantic models and async/await
- **API Design**: RESTful API architecture with automatic OpenAPI documentation
- **Database Operations**: Direct PostgreSQL queries with asyncpg and repository pattern

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
- **Python FastAPI Backend**: Complete API implementation with all CRUD operations
- **Repository Pattern**: Clean data access layer with async database operations
- **Express Proxy Server**: Request forwarding and frontend serving
- **File Handling**: Photo upload capabilities (ready for implementation)
- **Session Management**: User session handling (infrastructure prepared)

## Data Flow

### Client-Server Communication
1. Frontend makes API requests through TanStack Query
2. Express.js proxy forwards requests to Python FastAPI backend
3. Python FastAPI handles validation, business logic, and database operations
4. Repository pattern with asyncpg provides database access
5. Response data flows back through the proxy to frontend

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
├── client/              # React frontend application
├── server/              # Express.js proxy server (index.ts, vite.ts)
├── python_backend/      # Python FastAPI backend with all API logic
├── shared/              # Shared TypeScript types and schemas
├── uploads/             # File storage for uploaded photos
└── dist/               # Production build output
```

### Scaling Considerations
- File uploads currently use local filesystem storage
- Database connection pooling through Neon serverless
- Session management infrastructure prepared for authentication
- Component architecture supports feature expansion

## Recent Changes

### August 2025 - RBAC System Design Complete
- **User Feedback Integration**: All 10 user suggestions adopted for production-ready RBAC
- **Company 0 Strategy**: Platform staff and customers use unified schema with RLS isolation
- **Role Template System**: Prevents role explosion, allows inheritance and customization
- **Integer Permissions**: Type-safe enum-based permissions for performance and static analysis
- **Database RLS**: Row-level security policies for defense-in-depth data protection
- **Performance Optimization**: Cached effective permissions, strategic indexing for scale
- **Audit Compliance**: Full audit trails with grantor tracking and expiration dates
- **ABAC Edge Cases**: JSON-based attribute rules for complex business logic
- **Security Hygiene**: MFA requirements, least privilege, financial data elevation
- **Multi-tenant Architecture**: Complete separation with cross-company impersonation support

### July 2025 - Critical Task Checkbox Functionality Fixed
- **MAJOR SUCCESS**: Completely resolved the broken task checkbox functionality that was causing 502 Bad Gateway errors
- **Root Cause**: Proxy middleware was failing to forward PATCH requests from Express to Python backend
- **Solution Implemented**: Created manual Express route handler for `/api/tasks/:id` PATCH requests
- **Technical Fix**: Direct fetch communication bypasses problematic proxy middleware entirely
- **Authentication**: Manual handler includes `requireAuth` middleware for security
- **Results**: All task checkboxes now work perfectly with proper status updates and persistence
- **Performance**: Task updates respond in ~450ms with comprehensive logging for debugging
- **User Impact**: Core task management functionality fully operational - checkboxes toggle status successfully

### July 2025 - Enhanced Subcontractor Task Management System
- Successfully implemented comprehensive subcontractor management with mandatory project selection
- Reordered task creation form fields to prioritize project selection as first required field
- Added validation to ensure project must be selected (cannot be empty or "none")
- Created two new organizational views in Subs tab:
  - "By Projects": Tasks grouped by construction projects with task counts and assignee details
  - "By Subcontractors": Tasks organized by individual subcontractors with project context
  - "Milestones": Dedicated view for milestone tasks with special visual indicators
- Enhanced form validation with clear asterisk (*) indicators for required fields
- All 10 subcontractors now properly display in assignment dropdowns
- Task creation working end-to-end with proper database constraints and validation
- Improved user experience with mandatory project workflow ensuring proper task organization
- Fixed responsive design issue: Added "Subs" tab to mobile navigation for tablet vertical position
- Fixed form data persistence: Task creation form now properly resets to blank state after each submission

### January 2025 - Timeline and Calendar Views for Schedule Management
- Successfully implemented comprehensive schedule visualization with three distinct views:
  - Overview: Traditional list view of upcoming tasks and schedule change requests
  - Timeline: Visual chronological timeline showing all tasks with priority indicators and due date calculations
  - Calendar: Monthly calendar grid displaying tasks and project deadlines with color-coded priority dots
- Added advanced date processing with days-from-now calculations and overdue indicators
- Enhanced task visualization with priority color coding (red/yellow/green) and category badges
- Implemented month navigation for calendar view with previous/next controls
- Added project deadline visualization alongside task deadlines in calendar view
- Timeline view shows detailed task information including project association and time remaining
- Calendar view groups multiple tasks per day with overflow indicators (+X more)
- All views maintain consistent construction-themed styling and responsive design

### January 2025 - Collapsible Task List Functionality and Backend Cleanup
- Successfully implemented collapsible dropdown sections for task lists in both Canvas and List views
- Added chevron icons with expand/collapse functionality for Project Tasks, Administrative Tasks, and General Tasks sections
- Individual projects within Project Tasks can also be collapsed independently
- Task counts displayed in badges next to section headers for easy reference
- Smooth hover effects and proper indentation for nested collapsible sections
- Cleaned up unused TypeScript backend files (routes.ts, storage.ts, db.ts) that were replaced by Python FastAPI
- Updated architecture documentation to reflect current Python-primary backend with Express proxy layer
- Confirmed all task list functionality working with improved organization and user control

### January 2025 - Task List View Implementation
- Successfully added view toggle buttons (Canvas/List) for different task organization preferences
- Created compact TaskListItem component with inline status updates and quick actions
- Implemented organized list view with tasks grouped by categories (Projects, Administrative, General)
- Added proper icon handling and color coding for different task categories
- Fixed React component import issues and JSX rendering errors
- List view provides alternative to canvas view for users preferring linear task organization

### July 2025 - List View Default and Project Editing Implementation
- Changed default view mode to "list" in both Projects and Tasks tabs for better organization
- Users can still toggle to canvas/cards view if preferred using the view mode buttons
- Successfully implemented complete project editing functionality with inline dialog forms
- Project edit dialog includes all fields: name, description, location, status, progress, and due date
- Both task and project editing now work seamlessly within their respective tabs without redirecting
- Fixed React component scope issues by properly ordering function definitions
- All form validation and API calls properly configured for project updates

### July 2025 - Direct Task Update System Implementation
- Removed approval workflow for schedule changes - changes now immediately update task due dates
- Modified schedule change API to directly update task information when changes are saved
- Added `update_due_date` method to TaskRepository for immediate task due date updates
- Changed "Submit Request" to "Save Changes" throughout schedule interface to reflect immediate updates
- Updated dialog titles from "Request Schedule Change" to "Update Task Schedule"
- Team members can now directly update task and project information without approval delays
- Frontend automatically refreshes task data when schedule changes are saved
- Database foreign key constraint error resolved by adding sample user to users table
- All task cards redirect to schedule page for seamless editing experience
- Schedule changes now create audit trail while immediately applying updates to tasks

### July 2025 - Express Proxy Fix for Task Creation
- Successfully resolved "Create task is not working" functionality issue
- Fixed Express proxy middleware to properly forward /api requests to Python FastAPI backend
- Implemented correct path rewriting: `/api/tasks` -> `/api/tasks` (preserving full path)
- Resolved timezone handling issue for due dates in task creation
- Added automatic conversion of timezone-aware datetimes to timezone-naive for PostgreSQL compatibility
- Confirmed task creation working end-to-end: frontend -> Express proxy -> Python backend -> database
- All CRUD operations now functioning correctly with proper HTTP status codes (201 Created)
- Frontend loading correctly alongside working API proxy functionality
- Task creation from Projects tab now fully operational with proper due date handling
- Added validation to make project selection mandatory when "Project Related" category is chosen
- Implemented both frontend (Zod schema) and backend (FastAPI) validation for project requirement
- Dynamic form labels show "Project (Required)" vs "Project (Optional)" based on category selection
- "No Project" option hidden when project category is selected to enforce validation

### July 2025 - Backend Restructuring and Organization
- Successfully restructured Python backend into professional folder organization:
  - `python_backend/src/api/` - API route handlers organized by feature
  - `python_backend/src/models/` - Pydantic models with proper inheritance
  - `python_backend/src/database/` - Database connection and repository pattern
  - `python_backend/src/core/` - Configuration and application settings
  - `python_backend/src/utils/` - Utility functions for data conversion
- Implemented repository pattern for clean data access separation
- Added comprehensive documentation and README for backend structure
- Maintained full API compatibility with existing frontend
- Created modular architecture following Python best practices

### July 2025 - Complete Task Management System Implementation
- Successfully resolved all task creation API validation issues
- Implemented comprehensive task management with dual creation paths:
  - Main task creation from Tasks page with full categorization
  - Direct task creation from project dropdown menus (Add Task option)
- Enhanced task management canvas with tabbed interface:
  - Overview tab with statistics and recent activity by category
  - By Projects tab showing tasks grouped under construction projects  
  - Administrative tab for management and office tasks
  - General tab for operational tasks not tied to projects
- Added inline status updates for quick task management without dialog forms
- Implemented visual category indicators and priority badges
- Created task creation dialog accessible from both main page and project cards
- Confirmed API functionality with successful task creation (status 201 responses)

### Database Schema Updates
- Modified tasks table to make projectId optional (nullable foreign key) 
- Added category column to tasks table for task classification (project, administrative, general)
- Pushed schema changes to PostgreSQL database successfully
- All CRUD operations working properly with validation

### Technical Improvements
- Fixed LSP validation errors in task creation forms
- Implemented proper TypeScript typing for all task operations
- Added comprehensive error handling and loading states
- Enhanced UI with construction-themed styling and responsive design

The system is designed to be easily maintainable and scalable, with clear separation between frontend, backend, and database layers. The use of TypeScript throughout ensures type safety, while the modern tooling provides excellent developer experience.