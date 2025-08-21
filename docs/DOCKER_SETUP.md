# Docker Development Setup Guide

## Overview

RedZ uses Docker for local development infrastructure. The setup includes PostgreSQL, MongoDB, Redis, Elasticsearch, and RabbitMQ as containerized services.

## Current Docker Configuration

Based on the existing `docker-compose.yml`, the infrastructure includes:

### Services
- **PostgreSQL**: Main relational database
- **MongoDB**: Flexible document storage
- **Redis**: Caching and session storage
- **Elasticsearch**: Search and indexing
- **RabbitMQ**: Message queue (to be added)

### Ports
- PostgreSQL: `5432`
- MongoDB: `27017`
- Redis: `6379`
- Elasticsearch: `9200`, `9300`

## Getting Started

### Prerequisites
- Docker Desktop 4.20+
- Docker Compose 2.20+
- Node.js 18+

### Start Infrastructure

```bash
# Start all database services
docker-compose up -d

# Check services are running
docker-compose ps

# View logs
docker-compose logs
```

### Stop Infrastructure

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (reset data)
docker-compose down -v
```

## Database Setup

### PostgreSQL
- **Host**: localhost:5432
- **User**: redz
- **Password**: redz
- **Connection**: `postgresql://redz:redz@localhost:5432/redz`

### MongoDB
- **Host**: localhost:27017
- **User**: root
- **Password**: example
- **Connection**: `mongodb://root:example@localhost:27017`

### Redis
- **Host**: localhost:6379
- **Configuration**: 1GB cache with LRU eviction

### Elasticsearch
- **Host**: localhost:9200
- **Configuration**: Single node, 1GB heap

## Development Workflow

### Database Migrations

Each service manages its own database migrations:

```bash
# Run migrations for specific service
npx nx database:migrate user-service
npx nx database:migrate document-service
npx nx database:migrate analytics-service
```

### Environment Variables

Create a `.env` file in the root:

```bash
# Database URLs
POSTGRES_URL=postgresql://redz:redz@localhost:5432/redz
MONGODB_URL=mongodb://root:example@localhost:27017
REDIS_URL=redis://localhost:6379
ELASTICSEARCH_URL=http://localhost:9200

# JWT Configuration
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h

# File Storage
STORAGE_PATH=./uploads
MAX_FILE_SIZE=100MB
```

## Service Development

Application services will be developed as needed and run directly with:

```bash
# Start a service in development mode
npx nx serve api-gateway
npx nx serve document-service
npx nx serve search-service
```

## Troubleshooting

### Port Conflicts
```bash
# Check if ports are in use
netstat -tulpn | grep :5432
netstat -tulpn | grep :27017
netstat -tulpn | grep :6379
netstat -tulpn | grep :9200
```

### Reset Databases
```bash
# Stop and remove all data
docker-compose down -v

# Start fresh
docker-compose up -d
```

### Check Service Health
```bash
# PostgreSQL
docker-compose exec postgres pg_isready -U redz

# MongoDB
docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"

# Redis
docker-compose exec redis redis-cli ping

# Elasticsearch
curl http://localhost:9200/_cluster/health
```

This simple Docker setup provides the foundation for RedZ development while keeping the infrastructure lightweight and manageable.