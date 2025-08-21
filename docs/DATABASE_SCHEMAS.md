# Database Schemas Documentation

## Overview

RedZ uses a simple database setup with PostgreSQL for main data, MongoDB for flexible document storage, Elasticsearch for search, and Redis for caching.

## PostgreSQL Schemas

### Users Table

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
```

### Documents Table

```sql
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    file_path VARCHAR(1000) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    owner_id UUID NOT NULL,
    department VARCHAR(100),
    access_level VARCHAR(20) DEFAULT 'private',
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_documents_owner_id ON documents(owner_id);
CREATE INDEX idx_documents_document_type ON documents(document_type);
```

### Document Metadata Table

```sql
CREATE TABLE document_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    word_count INTEGER,
    reading_time INTEGER,
    language VARCHAR(10),
    sentiment_score DECIMAL(4,3),
    topics JSONB DEFAULT '[]',
    keywords JSONB DEFAULT '[]',
    extraction_status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_document_metadata_document_id ON document_metadata(document_id);
```

### Analytics Events Table

```sql
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL,
    document_id UUID,
    user_id UUID,
    metadata JSONB DEFAULT '{}',
    timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_timestamp ON analytics_events(timestamp);
```

## MongoDB Collections

### Document Content Collection

```javascript
// documents_content
{
  _id: ObjectId,
  document_id: String, // References PostgreSQL documents.id
  content: String,     // Full text content
  chunks: [
    {
      text: String,
      position: Number,
      vector: [Number]   // Embedding vector
    }
  ],
  created_at: Date,
  updated_at: Date
}
```

## Elasticsearch Indices

### Documents Index

- **Index**: `documents`
- **Purpose**: Full-text search and semantic search
- **Fields**: title, content, metadata, vectors

### Search Analytics Index

- **Index**: `search_analytics`
- **Purpose**: Track search queries and results
- **Fields**: query, user_id, results_count, timestamp

## Redis Structure

### Session Storage

```
user:session:{token} -> user data (TTL: 24h)
```

### Search Cache

```
search:query:{hash} -> search results (TTL: 5min)
```

### Rate Limiting

```
rate_limit:user:{user_id} -> request count (TTL: 1h)
```

## Migration Strategy

Each service has its own migrations using Knex.ts:

```bash
# Run migrations for specific service
npx nx database:migrate user-service
npx nx database:migrate document-service
npx nx database:migrate analytics-service
```

### Migration File Structure

```
services/
├── user-service/
│   ├── migrations/
│   │   └── 001_create_users.ts
│   └── knexfile.ts
├── document-service/
│   ├── migrations/
│   │   ├── 001_create_documents.ts
│   │   └── 002_create_document_metadata.ts
│   └── knexfile.ts
└── analytics-service/
    ├── migrations/
    │   └── 001_create_analytics_events.ts
    └── knexfile.ts
```

This simple schema provides the foundation for RedZ's core functionality while keeping complexity minimal.
