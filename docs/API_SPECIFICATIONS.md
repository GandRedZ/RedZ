# API Specifications and Gateway Routing

## Overview

RedZ follows RESTful API design principles with a centralized API Gateway that handles authentication, routing, and cross-cutting concerns. All client communication goes through the gateway, which then routes requests to appropriate microservices.

## API Gateway Configuration

### Base URL Structure
```
Production: https://api.redz.dev
Development: http://localhost:8000
```

### API Versioning
All APIs are versioned using URL path versioning:
```
/api/v1/{resource}
```

### Global Headers
```http
Content-Type: application/json
Authorization: Bearer {jwt_token}
X-Request-ID: {correlation_id}
X-Client-Version: {client_version}
```

## Authentication & Authorization

### JWT Token Structure
```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "user_id",
    "email": "user@example.com",
    "role": "user",
    "permissions": ["read", "write"],
    "iat": 1640995200,
    "exp": 1641081600
  }
}
```

### Authorization Levels
- **Public**: No authentication required
- **Authenticated**: Valid JWT token required
- **Role-based**: Specific role required (admin, analyst, manager, user)
- **Owner**: Resource owner or admin access required

## API Gateway Routes

### Authentication Routes → User Service (Port 8004)
```
POST   /api/v1/auth/register           → user-service:8004/auth/register
POST   /api/v1/auth/login              → user-service:8004/auth/login
POST   /api/v1/auth/logout             → user-service:8004/auth/logout
POST   /api/v1/auth/refresh            → user-service:8004/auth/refresh
GET    /api/v1/auth/profile            → user-service:8004/auth/profile
PUT    /api/v1/auth/profile            → user-service:8004/auth/profile
POST   /api/v1/auth/forgot-password    → user-service:8004/auth/forgot-password
POST   /api/v1/auth/reset-password     → user-service:8004/auth/reset-password
```

### Document Routes → Document Service (Port 8001)
```
GET    /api/v1/documents               → document-service:8001/documents
POST   /api/v1/documents               → document-service:8001/documents
GET    /api/v1/documents/:id           → document-service:8001/documents/:id
PUT    /api/v1/documents/:id           → document-service:8001/documents/:id
DELETE /api/v1/documents/:id           → document-service:8001/documents/:id
GET    /api/v1/documents/:id/versions  → document-service:8001/documents/:id/versions
POST   /api/v1/documents/:id/versions  → document-service:8001/documents/:id/versions
GET    /api/v1/documents/:id/metadata  → document-service:8001/documents/:id/metadata
```

### Search Routes → Search Service (Port 8002)
```
POST   /api/v1/search/fulltext         → search-service:8002/search/fulltext
POST   /api/v1/search/semantic         → search-service:8002/search/semantic
POST   /api/v1/search/hybrid           → search-service:8002/search/hybrid
GET    /api/v1/search/suggestions      → search-service:8002/search/suggestions
POST   /api/v1/search/reindex          → search-service:8002/search/reindex
```

### File Routes → Storage Service (Port 8005)
```
POST   /api/v1/files/upload            → storage-service:8005/files/upload
GET    /api/v1/files/:id               → storage-service:8005/files/:id
GET    /api/v1/files/:id/thumbnail     → storage-service:8005/files/:id/thumbnail
DELETE /api/v1/files/:id               → storage-service:8005/files/:id
```

### Analytics Routes → Analytics Service (Port 8003)
```
GET    /api/v1/analytics/dashboard     → analytics-service:8003/analytics/dashboard
GET    /api/v1/analytics/trends/:type  → analytics-service:8003/analytics/trends/:type
GET    /api/v1/analytics/documents/:id → analytics-service:8003/analytics/documents/:id
POST   /api/v1/analytics/events        → analytics-service:8003/analytics/events
```

## Detailed API Specifications

### User Service APIs

#### POST /api/v1/auth/register
Register a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "first_name": "John",
  "last_name": "Doe",
  "department": "Engineering"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "role": "user",
      "is_active": true,
      "email_verified": false,
      "created_at": "2024-01-01T12:00:00Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 86400
  }
}
```

#### POST /api/v1/auth/login
Authenticate user and return JWT token.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "role": "user"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 86400
  }
}
```

### Document Service APIs

#### GET /api/v1/documents
List documents with filtering and pagination.

**Query Parameters:**
- `page` (int): Page number (default: 1)
- `limit` (int): Items per page (default: 20, max: 100)
- `type` (string): Document type filter
- `department` (string): Department filter
- `owner_id` (uuid): Owner filter
- `sort` (string): Sort field (created_at, title, size)
- `order` (string): Sort order (asc, desc)
- `search` (string): Search in title and description

**Response (200):**
```json
{
  "success": true,
  "data": {
    "documents": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "title": "Project Requirements Document",
        "description": "Technical requirements for the new feature",
        "document_type": "pdf",
        "file_size": 1048576,
        "owner": {
          "id": "660f9500-f30c-52e5-b827-557766551111",
          "name": "John Doe",
          "email": "john@example.com"
        },
        "department": "Engineering",
        "access_level": "private",
        "version": 2,
        "created_at": "2024-01-01T12:00:00Z",
        "updated_at": "2024-01-02T14:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "pages": 8,
      "has_next": true,
      "has_prev": false
    }
  }
}
```

#### POST /api/v1/documents
Upload a new document.

**Request (multipart/form-data):**
```
file: [binary file data]
title: "Project Requirements Document"
description: "Technical requirements for the new feature"
department: "Engineering"
project: "RedZ Platform"
access_level: "private"
tags: ["requirements", "technical", "v2.0"]
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "document": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Project Requirements Document",
      "description": "Technical requirements for the new feature",
      "document_type": "pdf",
      "file_size": 1048576,
      "file_path": "/uploads/documents/2024/01/550e8400-e29b-41d4-a716-446655440000.pdf",
      "checksum": "sha256:a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3",
      "owner_id": "660f9500-f30c-52e5-b827-557766551111",
      "department": "Engineering",
      "access_level": "private",
      "version": 1,
      "status": "processing",
      "created_at": "2024-01-01T12:00:00Z"
    },
    "upload_status": "processing"
  }
}
```

#### GET /api/v1/documents/:id
Get document details and metadata.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "document": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Project Requirements Document",
      "description": "Technical requirements for the new feature",
      "document_type": "pdf",
      "file_size": 1048576,
      "owner": {
        "id": "660f9500-f30c-52e5-b827-557766551111",
        "name": "John Doe",
        "email": "john@example.com"
      },
      "department": "Engineering",
      "access_level": "private",
      "version": 2,
      "metadata": {
        "word_count": 2500,
        "reading_time": 10,
        "language": "en",
        "sentiment_score": 0.65,
        "topic_classifications": ["technical", "requirements", "software"],
        "key_entities": [
          {"text": "RedZ Platform", "type": "PRODUCT", "confidence": 0.95},
          {"text": "microservices", "type": "CONCEPT", "confidence": 0.88}
        ],
        "content_summary": "Document outlining technical requirements..."
      },
      "permissions": {
        "can_read": true,
        "can_write": true,
        "can_delete": true,
        "can_share": true
      },
      "created_at": "2024-01-01T12:00:00Z",
      "updated_at": "2024-01-02T14:30:00Z"
    }
  }
}
```

### Search Service APIs

#### POST /api/v1/search/semantic
Perform semantic similarity search using vector embeddings.

**Request:**
```json
{
  "query": "machine learning algorithms for document classification",
  "filters": {
    "document_type": ["pdf", "notion_doc"],
    "department": ["Engineering", "Data Science"],
    "access_level": ["public", "private"],
    "date_range": {
      "start": "2024-01-01",
      "end": "2024-12-31"
    }
  },
  "limit": 20,
  "include_metadata": true,
  "similarity_threshold": 0.7
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "document": {
          "id": "550e8400-e29b-41d4-a716-446655440000",
          "title": "ML Classification Techniques",
          "description": "Overview of machine learning algorithms...",
          "document_type": "pdf",
          "owner": {
            "name": "Jane Smith",
            "department": "Data Science"
          },
          "created_at": "2024-01-15T10:00:00Z"
        },
        "relevance_score": 0.92,
        "similarity_score": 0.89,
        "matched_content": [
          "machine learning algorithms for text classification...",
          "document categorization using neural networks..."
        ],
        "highlighted_terms": ["machine learning", "algorithms", "classification"]
      }
    ],
    "search_metadata": {
      "total_results": 15,
      "search_time_ms": 45,
      "query_vector_generated": true,
      "filters_applied": {
        "document_type": 2,
        "department": 2,
        "date_range": true
      }
    }
  }
}
```

#### POST /api/v1/search/fulltext
Perform full-text search with advanced query syntax.

**Request:**
```json
{
  "query": "machine learning AND (classification OR categorization)",
  "filters": {
    "document_type": ["pdf"],
    "sentiment_range": {
      "min": 0.0,
      "max": 1.0
    }
  },
  "highlight": true,
  "facets": ["document_type", "department", "topic_classifications"],
  "limit": 20,
  "offset": 0
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "document": {
          "id": "550e8400-e29b-41d4-a716-446655440000",
          "title": "ML Classification Techniques",
          "description": "Overview of machine learning algorithms...",
          "document_type": "pdf"
        },
        "relevance_score": 0.95,
        "highlights": {
          "title": ["ML <em>Classification</em> Techniques"],
          "content": [
            "<em>Machine learning</em> algorithms for document <em>classification</em>...",
            "Various <em>categorization</em> methods are discussed..."
          ]
        }
      }
    ],
    "facets": {
      "document_type": {
        "pdf": 12,
        "notion_doc": 3
      },
      "department": {
        "Engineering": 8,
        "Data Science": 7
      }
    },
    "search_metadata": {
      "total_results": 15,
      "search_time_ms": 23,
      "query_parsed": "machine learning AND (classification OR categorization)"
    }
  }
}
```

### Analytics Service APIs

#### GET /api/v1/analytics/dashboard
Get dashboard metrics and KPIs.

**Query Parameters:**
- `period` (string): Time period (today, week, month, quarter, year)
- `department` (string): Filter by department
- `user_id` (uuid): Filter by specific user

**Response (200):**
```json
{
  "success": true,
  "data": {
    "summary": {
      "total_documents": 1250,
      "documents_uploaded_today": 15,
      "total_searches": 8500,
      "searches_today": 145,
      "active_users": 89,
      "storage_used_gb": 45.7
    },
    "trends": {
      "document_uploads": [
        {"date": "2024-01-01", "count": 12},
        {"date": "2024-01-02", "count": 18},
        {"date": "2024-01-03", "count": 15}
      ],
      "search_volume": [
        {"date": "2024-01-01", "count": 134},
        {"date": "2024-01-02", "count": 156},
        {"date": "2024-01-03", "count": 145}
      ]
    },
    "top_content": {
      "most_viewed_documents": [
        {
          "document_id": "550e8400-e29b-41d4-a716-446655440000",
          "title": "API Documentation",
          "views": 245
        }
      ],
      "trending_searches": [
        {"query": "machine learning", "count": 89},
        {"query": "api documentation", "count": 67}
      ]
    },
    "user_engagement": {
      "avg_session_duration": 1420,
      "documents_per_user": 14.0,
      "searches_per_user": 95.5
    }
  }
}
```

#### GET /api/v1/analytics/trends/:type
Get specific trend analysis data.

**Path Parameters:**
- `type`: trend type (topic_evolution, sentiment_trend, usage_pattern, content_category)

**Query Parameters:**
- `period_start` (date): Start date for analysis
- `period_end` (date): End date for analysis
- `granularity` (string): Data granularity (hour, day, week, month)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "trend_type": "topic_evolution",
    "period": {
      "start": "2024-01-01T00:00:00Z",
      "end": "2024-01-31T23:59:59Z"
    },
    "analysis": {
      "trending_topics": [
        {
          "topic": "artificial intelligence",
          "growth_rate": 0.25,
          "document_count": 145,
          "timeline": [
            {"date": "2024-01-01", "count": 12, "sentiment": 0.72},
            {"date": "2024-01-02", "count": 15, "sentiment": 0.75}
          ]
        }
      ],
      "declining_topics": [
        {
          "topic": "legacy systems",
          "decline_rate": -0.15,
          "document_count": 23
        }
      ],
      "emerging_topics": [
        {
          "topic": "quantum computing",
          "emergence_score": 0.89,
          "first_appearance": "2024-01-15T00:00:00Z"
        }
      ]
    },
    "insights": [
      "AI-related content has increased by 25% this month",
      "Quantum computing emerged as a new topic with high engagement"
    ],
    "confidence_level": 0.87
  }
}
```

## Error Response Format

All APIs return errors in a consistent format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {
      "field": "email",
      "reason": "Invalid email format"
    },
    "request_id": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": "2024-01-01T12:00:00Z"
  }
}
```

### Error Codes
- `VALIDATION_ERROR` (400): Request validation failed
- `UNAUTHORIZED` (401): Authentication required
- `FORBIDDEN` (403): Insufficient permissions
- `NOT_FOUND` (404): Resource not found
- `CONFLICT` (409): Resource conflict
- `RATE_LIMITED` (429): Rate limit exceeded
- `INTERNAL_ERROR` (500): Internal server error
- `SERVICE_UNAVAILABLE` (503): Service temporarily unavailable

## Rate Limiting

### Default Limits
- **General API**: 1000 requests per hour per user
- **Search API**: 100 requests per minute per user
- **Upload API**: 10 uploads per minute per user
- **Anonymous**: 50 requests per hour per IP

### Rate Limit Headers
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
X-RateLimit-Window: 3600
```

## API Versioning Strategy

### Current Version: v1
- All new features added to v1
- Backward compatibility maintained
- Deprecation notices for planned changes

### Future Versioning
- v2: Planned breaking changes
- Version-specific routing
- Gradual migration support

## OpenAPI Documentation

Full OpenAPI 3.0 specifications are available at:
- Development: http://localhost:8000/docs
- Production: https://api.redz.dev/docs

Interactive API testing available via Swagger UI at the same endpoints.