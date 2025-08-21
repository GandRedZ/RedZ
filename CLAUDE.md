# RedZ - Document Management & Semantic Analytics Platform

## Project Overview

RedZ is a comprehensive document management system that combines semantic search capabilities with real-time data analytics for trend detection. The platform enables users to manage, version, upload, and modify documents while leveraging semantic analysis to generate vector representations that enrich document understanding.

### Core Features
- **Document Management**: Upload, edit, version, and organize PDFs, images, and Notion-like documents
- **Semantic Search**: Vector-based search using Elasticsearch for enhanced document discovery
- **Real-time Analytics**: Streaming pipeline for trend detection and business intelligence
- **Business Intelligence**: Dashboards and metrics for data-driven decision making
- **Content Analytics**: Topic evolution, sentiment analysis, and semantic categorization

## Architecture Overview

### Microservices Architecture
This is a monorepo with service-based architecture where each service manages its own database:

1. **API Gateway Service** - Authentication, routing, rate limiting
2. **Document Service** - Document CRUD, versioning, metadata management
3. **Search Service** - Semantic search, vector operations, Elasticsearch integration
4. **Analytics Service** - Trend detection, sentiment analysis, BI metrics
5. **User Management Service** - Authentication, authorization, user profiles
6. **Notification Service** - Event handling, real-time updates
7. **Storage Service** - File storage management (local filesystem initially)

### Technology Stack

#### Backend
- **Framework**: Fastify (each service has its own instance)
- **Language**: Node.js/TypeScript
- **API Gateway**: Custom Fastify-based gateway

#### Databases
- **PostgreSQL**: Transactional data (users, documents metadata, versions)
- **Elasticsearch**: Search indices, vector embeddings, semantic data
- **Redis**: Caching, session management, real-time data

#### Message Queue
- **RabbitMQ**: Event-driven communication between services

#### Infrastructure
- **Containerization**: Docker for all services and databases
- **Development**: Local development environment
- **Storage**: Local filesystem (S3/Azure Blob planned for future)

#### Frontend
- **Framework**: Next.js with React
- **UI**: Modern dashboard with BI visualization capabilities

## Database Strategy

### PostgreSQL Usage
- User accounts and authentication data
- Document metadata and versioning information
- Business logic and transactional data
- Audit logs and system events

### Elasticsearch Usage
- Document content indexing for full-text search
- Vector embeddings for semantic search
- Search analytics and query performance metrics
- Content categorization and tagging

### Redis Usage
- Session management and caching
- Real-time analytics aggregation
- Rate limiting data
- Temporary processing data

## Document Metadata Schema

### Basic Metadata
- `id`: Unique document identifier
- `title`: Document title
- `description`: User-provided description
- `author_id`: Creator user ID
- `created_at`: Creation timestamp
- `updated_at`: Last modification timestamp
- `file_size`: Document size in bytes
- `document_type`: PDF, IMAGE, NOTION_DOC
- `version`: Simple numeric versioning (1, 2, 3...)

### Content Analysis Metadata
- `word_count`: Total word count
- `reading_time`: Estimated reading time in minutes
- `language`: Detected language code
- `content_categories`: Array of category tags
- `extraction_status`: SUCCESS, FAILED, PROCESSING

### Semantic Metadata
- `topic_classifications`: Array of detected topics
- `sentiment_score`: Overall sentiment (-1 to 1)
- `key_entities`: Extracted named entities
- `content_summary`: AI-generated summary
- `semantic_tags`: Auto-generated semantic tags

### Usage Analytics Metadata
- `view_count`: Number of views
- `edit_frequency`: Edit frequency score
- `last_accessed`: Last access timestamp
- `search_ranking`: Search relevance score
- `collaboration_metrics`: Sharing and collaboration data

### Business Metadata
- `department`: Owning department/team
- `access_level`: PUBLIC, PRIVATE, RESTRICTED
- `retention_policy`: Data retention rules
- `compliance_tags`: Regulatory compliance tags

## Development Guidelines

### Service Development
1. Each microservice should be in its own directory under `/services/`
2. Use Fastify with TypeScript for all services
3. Implement proper error handling and logging
4. Follow RESTful API conventions
5. Include comprehensive tests for each service

### Database Migrations
- Use a consistent migration tool across all PostgreSQL databases
- Version migrations with timestamps
- Include rollback scripts for all migrations
- Document schema changes in service-specific documentation

### Message Queue Patterns
- Use RabbitMQ for async communication between services
- Implement proper retry mechanisms and dead letter queues
- Log all message processing for debugging
- Use event sourcing patterns where appropriate

### Docker Development
- Each service should have its own Dockerfile
- Use docker-compose for local development
- Include health checks for all containers
- Optimize images for production deployment

## API Gateway Configuration

### Authentication
- JWT-based authentication
- Role-based access control (RBAC)
- API key management for external integrations

### Routing Rules
- `/api/v1/auth/*` → User Management Service
- `/api/v1/documents/*` → Document Service
- `/api/v1/search/*` → Search Service
- `/api/v1/analytics/*` → Analytics Service
- `/api/v1/files/*` → Storage Service

### Rate Limiting
- Per-user rate limits
- API key-based limits
- Service-to-service rate limiting

## Semantic Search Implementation

### Vector Embeddings
- Use sentence transformers for document embeddings
- Store vectors in Elasticsearch with optimized indexing
- Implement similarity search with configurable thresholds
- Support for multiple embedding models

### Search Features
- Full-text search with Elasticsearch
- Semantic similarity search using vectors
- Faceted search with metadata filters
- Search result ranking and relevance scoring

## Analytics Pipeline

### Real-time Processing
- Stream document events through RabbitMQ
- Process content for sentiment analysis
- Extract topics and entities in real-time
- Update search indices incrementally

### Trend Detection
- Topic evolution over time
- Sentiment trend analysis
- Content category distribution
- User engagement patterns

### Business Intelligence
- Executive dashboards with key metrics
- Content performance analytics
- User behavior insights
- System performance monitoring

## Testing Strategy

### Unit Testing
- Test individual service functions
- Mock external dependencies
- Achieve >80% code coverage

### Integration Testing
- Test service-to-service communication
- Database integration tests
- Message queue processing tests

### End-to-End Testing
- Complete user workflow testing
- API gateway routing tests
- Frontend integration tests

## Deployment Considerations

### Local Development
- Docker Compose for complete stack
- Hot reloading for development
- Comprehensive logging and debugging

### Production Readiness
- Container orchestration planning
- Database backup and recovery
- Monitoring and alerting setup
- Performance optimization

## AI Assistant Instructions

When working on this project:

1. **Always check existing services** before creating new ones
2. **Follow the established patterns** for database usage and service communication
3. **Use TypeScript** throughout the codebase
4. **Implement proper error handling** in all services
5. **Add appropriate tests** for new functionality
6. **Update this documentation** when making architectural changes
7. **Consider semantic search implications** when working with document content
8. **Maintain consistency** in API design across services
9. **Use the established metadata schema** when working with documents
10. **Consider analytics implications** of any data structure changes

### Common Commands
- `npm run dev` - Start development environment
- `npm run test` - Run test suite
- `npm run build` - Build all services
- `npm run lint` - Lint codebase
- `npm run typecheck` - TypeScript type checking
- `docker-compose up` - Start local infrastructure
- `npm run migrate` - Run database migrations

### Project Structure
```
/services/
  /api-gateway/
  /document-service/
  /search-service/
  /analytics-service/
  /user-service/
  /storage-service/
/frontend/
/infrastructure/
  /docker/
  /migrations/
/docs/
/tests/
```

This project aims to create a comprehensive document management platform that rivals tools like Notion while providing advanced semantic search and analytics capabilities. Focus on building scalable, maintainable services that can evolve with business needs.