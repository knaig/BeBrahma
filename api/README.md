# BeBrahma v0.3 API

FastAPI backend for BeBrahma AI Co-Founder.

## Features

- **NBA Engine**: Next Best Action recommendation system
- **Business State Graph**: PostgreSQL-based context storage
- **Multi-Framework**: Problem-Solution Fit, ICP+Wedge, Critical Unknown Mapping
- **Override Learning**: Personalized recommendations based on user behavior
- **Integrations**: Google Calendar, Linear, Asana

## Tech Stack

- **Framework**: FastAPI 0.104+
- **Database**: PostgreSQL with async SQLAlchemy
- **Caching**: Redis
- **Authentication**: Clerk JWT tokens
- **LLM**: Claude (Anthropic) + GPT (OpenAI)

## Project Structure

```
api/
├── app/
│   ├── main.py                 # FastAPI application
│   ├── api/v1/                 # API endpoints
│   │   ├── endpoints/          # Endpoint modules
│   │   └── __init__.py         # API router
│   ├── core/                   # Core utilities
│   │   ├── config.py           # Settings
│   │   ├── logging.py          # Logging setup
│   │   └── redis_client.py     # Redis client
│   ├── db/                     # Database
│   │   ├── session.py          # SQLAlchemy session
│   │   └── models/             # SQLAlchemy models
│   ├── schemas/                # Pydantic schemas (request/response)
│   ├── services/               # Business logic
│   │   ├── nba_engine.py       # NBA recommendation engine
│   │   ├── framework_router.py # Framework selection
│   │   ├── scoring_service.py  # Task scoring
│   │   ├── confidence_service.py
│   │   ├── rationale_service.py
│   │   └── learning_service.py # Override learning
│   └── frameworks/             # Framework implementations
│       ├── problem_solution_fit.py
│       ├── icp_wedge.py
│       └── critical_unknown.py
├── alembic/                    # Database migrations
├── tests/                      # Tests
├── requirements.txt            # Python dependencies
└── .env.example                # Environment variables template
```

## Setup

### 1. Install Dependencies

```bash
cd api
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your values
```

### 3. Setup Database

```bash
# Create database
createdb bebrahma_v3

# Run migrations
alembic upgrade head
```

### 4. Start Redis

```bash
redis-server
```

### 5. Run API

```bash
# Development (with auto-reload)
python -m app.main

# Or with uvicorn directly
uvicorn app.main:app --reload --host 0.0.0.0 --port 3001
```

## API Documentation

Once running, access:
- **Swagger UI**: http://localhost:3001/api/docs
- **ReDoc**: http://localhost:3001/api/redoc

## Development

### Run Tests

```bash
pytest
```

### Code Quality

```bash
# Format code
black app/ tests/

# Lint
ruff check app/ tests/

# Type check
mypy app/
```

### Database Migrations

```bash
# Create new migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

## Deployment

See `/docs/DEPLOYMENT.md` for deployment instructions.

## Documentation

- [Architecture Design](/docs/bebrahma-v2/design/ARCHITECTURE.md)
- [Data Model](/docs/bebrahma-v2/design/DATA_MODEL.md)
- [API Specification](/docs/bebrahma-v2/design/API_SPEC.md)
- [NBA Engine Design](/docs/bebrahma-v2/design/NBA_ENGINE.md)
