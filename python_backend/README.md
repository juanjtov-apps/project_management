# Tower Flow Python Backend

A well-structured Python backend for the Tower Flow construction management system built with FastAPI.

## Architecture

### Directory Structure

```
python_backend/
├── src/
│   ├── api/                 # API route handlers
│   │   ├── projects.py      # Project endpoints
│   │   ├── tasks.py         # Task endpoints  
│   │   ├── photos.py        # Photo endpoints
│   │   ├── dashboard.py     # Dashboard endpoints
│   │   └── __init__.py      # API router configuration
│   ├── models/              # Pydantic models
│   │   ├── base.py          # Base models and enums
│   │   ├── project.py       # Project models
│   │   ├── task.py          # Task models
│   │   ├── user.py          # User models
│   │   ├── photo.py         # Photo models
│   │   ├── log.py           # Project log models
│   │   ├── notification.py  # Notification models
│   │   ├── schedule_change.py # Schedule change models
│   │   └── __init__.py      # Model exports
│   ├── database/            # Database layer
│   │   ├── connection.py    # Database connection management
│   │   ├── repositories.py  # Data access repositories
│   │   └── __init__.py
│   ├── core/                # Core configuration
│   │   ├── config.py        # Application settings
│   │   └── __init__.py
│   ├── utils/               # Utilities
│   │   ├── data_conversion.py # camelCase/snake_case conversion
│   │   └── __init__.py
│   └── __init__.py
├── tests/                   # Test files
├── migrations/              # Database migrations
├── main.py                  # Application entry point
├── requirements.txt         # Python dependencies
└── README.md               # This file
```

## Features

### API Endpoints
- **Projects**: CRUD operations for construction projects
- **Tasks**: Task management with categories and assignments
- **Photos**: File upload and management with project association
- **Dashboard**: Statistics and overview data
- **Users**: User management and authentication (ready)
- **Logs**: Project logging and documentation (ready)
- **Notifications**: Real-time notification system (ready)
- **Schedule Changes**: Crew schedule modification requests (ready)

### Database Integration
- PostgreSQL with asyncpg for async operations
- Repository pattern for clean data access
- Automatic camelCase/snake_case conversion for frontend compatibility
- Connection pooling for performance

### Development Features
- FastAPI with automatic API documentation
- Pydantic models for data validation
- CORS middleware for frontend integration
- File upload handling for photos
- Environment-based configuration

## Installation

1. Install dependencies:
```bash
cd python_backend
pip install -r requirements.txt
```

2. Set environment variables:
```bash
export DATABASE_URL="postgresql://user:pass@host:port/db"
export NODE_ENV="development"
```

3. Run the application:
```bash
python main.py
```

The API will be available at `http://localhost:8000` with documentation at `http://localhost:8000/docs`.

## Configuration

Configuration is managed in `src/core/config.py` using Pydantic settings:

- `DATABASE_URL`: PostgreSQL connection string
- `PORT`: Server port (default: 8000)
- `NODE_ENV`: Environment mode (development/production)
- `UPLOAD_DIR`: Directory for file uploads (default: uploads)

## Development

### Adding New Endpoints

1. Create model in `src/models/`
2. Add repository methods in `src/database/repositories.py`
3. Create API router in `src/api/`
4. Register router in `src/api/__init__.py`

### Data Conversion

The system automatically converts between camelCase (frontend) and snake_case (database) using utilities in `src/utils/data_conversion.py`.

### Testing

Test files should be placed in the `tests/` directory following the same structure as the source code.

## Deployment

For production deployment:

1. Set `NODE_ENV=production`
2. Configure proper database connection
3. Use a production WSGI server like Gunicorn
4. Set up proper logging and monitoring

## API Documentation

FastAPI automatically generates interactive API documentation available at `/docs` when running the server.