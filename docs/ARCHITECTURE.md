# RedZ Microservices Architecture

## System Overview

RedZ follows a microservices architecture pattern with clear service boundaries, each responsible for specific business capabilities. The system is designed for scalability, maintainability, and fault tolerance.

## Core Principles

- **Single Responsibility**: Each service owns one business capability
- **Database per Service**: Each service manages its own data store
- **API-First Design**: All services communicate through well-defined APIs
- **Event-Driven Communication**: Asynchronous communication via message queues
- **Stateless Services**: Services don't maintain client state between requests

## Service Architecture

### 1. API Gateway Service

**Port**: 8000  
**Database**: Redis (for rate limiting and session management)  
**Responsibilities**:

- Request routing to appropriate microservices
- Authentication and authorization
- Rate limiting and throttling
- Request/response logging
- Load balancing
- API versioning
- CORS handling

**Key Components**:

```
api-gateway/
├── src/
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── rate-limit.middleware.ts
│   │   └── logger.middleware.ts
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── document.routes.ts
│   │   ├── search.routes.ts
│   │   └── analytics.routes.ts
│   ├── services/
│   │   ├── proxy.service.ts
│   │   └── discovery.service.ts
│   └── app.ts
├── config/
│   └── gateway.config.ts
└── package.json
```

**Environment Variables**:

- `JWT_SECRET`: JWT signing secret
- `REDIS_URL`: Redis connection string
- `SERVICE_DISCOVERY_URL`: Service registry URL

### 2. User Management Service

**Port**: 8004  
**Database**: PostgreSQL (users schema)  
**Responsibilities**:

- User registration and authentication
- JWT token generation and validation
- Password management
- User profile management
- Role-based access control (RBAC)
- Account activation/deactivation

**API Endpoints**:

- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `POST /auth/refresh` - Token refresh
- `GET /auth/profile` - Get user profile
- `PUT /auth/profile` - Update user profile
- `POST /auth/forgot-password` - Password reset request
- `POST /auth/reset-password` - Password reset

### 3. Document Service

**Port**: 8001  
**Database**: PostgreSQL (documents schema)  
**Dependencies**: Storage Service, Search Service  
**Responsibilities**:

- Document CRUD operations
- Version management
- Metadata management
- Content extraction coordination
- Document lifecycle management

**Message Queue Events**:

- `document.uploaded` - New document uploaded
- `document.updated` - Document content updated
- `document.deleted` - Document deleted
- `document.version.created` - New version created

### 4. Search Service

**Port**: 8002  
**Database**: Elasticsearch  
**Dependencies**: Document Service  
**Responsibilities**:

- Document indexing for full-text search
- Vector embedding generation and storage
- Semantic similarity search
- Search suggestion generation
- Search analytics and optimization

**API Endpoints**:

- `POST /search/fulltext` - Full-text search
- `POST /search/semantic` - Semantic similarity search
- `POST /search/hybrid` - Combined full-text + semantic search
- `GET /search/suggestions` - Search suggestions
- `POST /search/reindex` - Reindex documents

### 5. Storage Service

**Port**: 8005  
**Storage**: Local filesystem (configurable to S3/Azure Blob)  
**Responsibilities**:

- File upload and download
- File validation and virus scanning
- Thumbnail generation for images
- PDF text extraction
- File compression and optimization
- Temporary file cleanup

**File Structure**:

```
uploads/
├── documents/
│   ├── 2024/
│   │   ├── 01/
│   │   │   ├── original/
│   │   │   ├── thumbnails/
│   │   │   └── processed/
├── temp/
│   └── uploads/
└── cache/
    ├── thumbnails/
    └── previews/
```

**API Endpoints**:

- `POST /files/upload` - Upload file
- `GET /files/:id` - Download file
- `GET /files/:id/thumbnail` - Get thumbnail
- `DELETE /files/:id` - Delete file
- `POST /files/:id/process` - Process file for content extraction

### 6. Analytics Service

**Port**: 8003  
**Database**: PostgreSQL (analytics schema) + Redis (real-time data)  
**Dependencies**: Document Service, Search Service  
**Responsibilities**:

- Document usage analytics
- Content trend analysis
- Sentiment analysis over time
- User behavior analytics
- Business intelligence metrics
- Dashboard data aggregation

**API Endpoints**:

- `GET /analytics/dashboard` - Dashboard metrics
- `GET /analytics/trends/:type` - Trend analysis data
- `GET /analytics/document/:id/stats` - Document-specific analytics
- `POST /analytics/event` - Track analytics event
- `GET /analytics/reports/:type` - Generate reports

## Inter-Service Communication

### Synchronous Communication (HTTP/REST)

- API Gateway → All Services (request routing)
- Document Service → Storage Service (file operations)
- Document Service → Search Service (indexing requests)
- Search Service → Document Service (document metadata)

### Asynchronous Communication (RabbitMQ)

**Event Flow**:

```
Document Upload Flow:
1. Client → API Gateway → Document Service (upload request)
2. Document Service → Storage Service (store file)
3. Document Service publishes 'document.uploaded' event
4. Search Service consumes event → indexes document
5. Analytics Service consumes event → tracks metrics

Search Flow:
1. Client → API Gateway → Search Service (search request)
2. Search Service → Elasticsearch (query execution)
3. Search Service publishes 'search.executed' event
4. Analytics Service consumes event → tracks search metrics
```

**Message Queue Topics**:

- `documents.*` - Document-related events
- `search.*` - Search-related events
- `analytics.*` - Analytics events
- `users.*` - User-related events

## Data Flow Architecture

```
┌─────────────┐    ┌─────────────────┐    ┌──────────────┐
│   Client    │───▶│   API Gateway   │───▶│   Services   │
└─────────────┘    └─────────────────┘    └──────────────┘
                            │                      │
                            ▼                      ▼
                   ┌─────────────────┐    ┌──────────────┐
                   │ Authentication  │    │  PostgreSQL  │
                   │     Redis       │    │              │
                   └─────────────────┘    │ Elasticsearch│
                                          │     Redis    │
                                          └──────────────┘
                                                  │
                                                  ▼
                                         ┌──────────────┐
                                         │   RabbitMQ   │
                                         │ Message Bus  │
                                         └──────────────┘
```

## Security Architecture

### Authentication Flow

1. User authenticates via User Service
2. JWT token issued with user claims
3. API Gateway validates JWT on each request
4. Services trust validated requests from gateway

### Authorization Levels

- **Public**: Anyone can access
- **Private**: Owner and assigned users only
- **Restricted**: Admin approval required

### Data Encryption

- TLS 1.3 for all HTTP communications
- Database encryption at rest
- JWT tokens with short expiration
- Sensitive data hashing (passwords, API keys)

## Scalability Considerations

### Horizontal Scaling

- Each service can be scaled independently
- Load balancing at API Gateway level
- Database connection pooling
- Elasticsearch cluster for search scaling

### Caching Strategy

- Redis for session data and frequent queries
- Application-level caching for metadata
- CDN for static file delivery
- Search result caching

### Performance Optimization

- Database query optimization with proper indexing
- Asynchronous processing for heavy operations
- Pagination for large result sets
- Connection pooling for database connections

## Monitoring and Observability

### Health Checks

- Each service exposes `/health` endpoint
- Database connectivity checks
- External service dependency checks
- Resource utilization monitoring

### Logging Strategy

- Structured JSON logging
- Centralized log aggregation
- Request correlation IDs
- Error tracking and alerting

### Metrics Collection

- Service-level metrics (response time, throughput)
- Business metrics (document uploads, searches)
- Infrastructure metrics (CPU, memory, disk)
- Custom application metrics

## Deployment Architecture

### Development Environment

```
┌─────────────┐
│   Docker    │
│  Compose    │
│             │
├─────────────┤
│ All Services│
│ + Databases │
│ + Message   │
│   Queue     │
└─────────────┘
```

### Production Environment (Future)

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Kubernetes  │    │  Managed    │    │   Cloud     │
│   Cluster   │───▶│ Databases   │───▶│  Storage    │
│             │    │             │    │             │
├─────────────┤    ├─────────────┤    ├─────────────┤
│- API Gateway│    │- PostgreSQL │    │- S3/Azure   │
│- Services   │    │- Redis      │    │- CDN        │
│- Load Bal.  │    │- Elasticsearch│  │- Monitoring │
└─────────────┘    └─────────────┘    └─────────────┘
```

This architecture provides a solid foundation for building a scalable, maintainable document management system with advanced semantic search and analytics capabilities.
