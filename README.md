# SkillSphere

A full-stack project management and collaboration platform built with Django REST Framework and React.

## Tech Stack

| Layer     | Technology                              |
|-----------|-----------------------------------------|
| Backend   | Django 6 + Django REST Framework        |
| Auth      | JWT (djangorestframework-simplejwt)     |
| Frontend  | React 19 + Vite + React Router          |
| Database  | PostgreSQL 16                           |
| Cache / Queue | Redis 7 + Celery                   |
| API Docs  | drf-spectacular (Swagger UI)            |
| Container | Docker + Docker Compose                 |

---

## Getting Started (Docker)

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/) installed

### 1. Clone the repository

```bash
git clone https://github.com/your-username/skillsphere.git
cd skillsphere
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and update the values — at minimum set a strong `DJANGO_SECRET_KEY`, your `POSTGRES_PASSWORD`, and your `EMAIL_HOST_PASSWORD`.

### 3. Start all services

```bash
docker compose up --build
```

This starts:
- **frontend** → http://localhost:80
- **backend API** → http://backend:8000 (proxied through frontend nginx)
- **Swagger docs** → http://localhost/api/schema/swagger-ui/
- **PostgreSQL** on port 5432 (internal)
- **Redis** on port 6379 (internal)
- **Celery** worker (background tasks)

### 4. Create a superuser (optional)

```bash
docker compose exec backend python manage.py createsuperuser
```

---

## Local Development (without Docker)

### Backend

```bash
# Create and activate virtual environment
python -m venv .venv
.venv\Scripts\activate        # Windows
source .venv/bin/activate     # macOS/Linux

pip install -r requirements.txt

# Make sure PostgreSQL and Redis are running locally, then:
python manage.py migrate
python manage.py runserver
```

### Celery worker

```bash
celery -A backend worker --loglevel=info
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend dev server runs at http://localhost:5173

---

## Project Structure

```
├── backend/          # Django project settings, urls, celery config
├── accounts/         # User authentication
├── activity/         # Activity tracking & middleware
├── dashboard/        # Dashboard views
├── feedback/         # Feedback system
├── files/            # File uploads
├── notifications/    # Notification system (Celery tasks)
├── projects/         # Project management
├── tags/             # Tagging system
├── frontend/         # React + Vite SPA
│   ├── src/
│   ├── Dockerfile
│   └── nginx.conf
├── Dockerfile        # Backend Docker image
├── docker-compose.yml
├── requirements.txt
└── .env.example
```

---

## Environment Variables

See `.env.example` for all available variables with descriptions.

| Variable              | Description                        |
|-----------------------|------------------------------------|
| `DJANGO_SECRET_KEY`   | Django secret key                  |
| `DJANGO_DEBUG`        | `True` for dev, `False` for prod   |
| `POSTGRES_DB`         | Database name                      |
| `POSTGRES_USER`       | Database user                      |
| `POSTGRES_PASSWORD`   | Database password                  |
| `EMAIL_HOST_USER`     | Gmail address for sending emails   |
| `EMAIL_HOST_PASSWORD` | Gmail app password                 |
