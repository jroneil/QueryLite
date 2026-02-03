# QueryLite Phase 2: Intelligence & Reliability

## Overview

Phase 2 focuses on making QueryLite more intelligent, reliable, and production-ready. This plan covers three key areas: **LLM Improvements**, **Error Handling**, and **Schema Intelligence**.

### Current Architecture Summary

| Component | File | Purpose |
|-----------|------|---------|
| LLM Service | `backend/app/services/llm_service.py` | OpenAI GPT-4 integration, SQL generation |
| Query Executor | `backend/app/services/query_executor.py` | SQL execution, schema introspection, chart recommendations |
| Query Router | `backend/app/routers/query.py` | API endpoints for NL queries |
| Config | `backend/app/config.py` | Environment settings |

---

## Proposed Changes

### LLM Improvements

#### [NEW] `backend/app/services/llm_providers/__init__.py`
Package initialization for LLM provider abstraction layer.

#### [NEW] `backend/app/services/llm_providers/base.py`
Abstract base class defining the LLM provider interface:
- `generate_sql(question, schema_info, table_names) -> SQLGenerationResult`
- `is_configured() -> bool`
- `get_provider_name() -> str`

#### [NEW] `backend/app/services/llm_providers/openai_provider.py`
OpenAI GPT-4 adapter (refactored from existing `llm_service.py`).

#### [NEW] `backend/app/services/llm_providers/anthropic_provider.py`
Anthropic Claude adapter using `anthropic` Python SDK.

#### [NEW] `backend/app/services/llm_providers/ollama_provider.py`
Ollama adapter for local models (Llama 3, Mistral, etc.) via HTTP API.

#### [MODIFY] `llm_service.py`
- Refactor to use provider abstraction
- Add provider selection logic based on config
- Implement `validate_sql()` method for syntax checking
- Add `refine_query()` method for "Did you mean...?" suggestions

#### [MODIFY] `config.py`
Add new settings:
```python
llm_provider: str = "openai"  # openai | anthropic | ollama
anthropic_api_key: str = ""
ollama_base_url: str = "http://localhost:11434"
ollama_model: str = "llama3"
confidence_threshold: float = 0.7  # Prompt user below this
```

#### [MODIFY] `query.py`
- Add confidence check before execution
- Return `requires_confirmation: bool` when confidence < threshold
- Add `/query/confirm` endpoint for low-confidence confirmations
- Add `/query/refine` endpoint for query suggestions

---

### Error Handling

#### [NEW] `backend/app/exceptions.py`
Custom exception hierarchy:
- `QueryLiteException` (base)
- `SQLSyntaxError`
- `QueryTimeoutError`
- `RateLimitExceededError`
- `ConnectionError`
- `LLMProviderError`

#### [NEW] `backend/app/middleware/error_handler.py`
Global exception handler middleware that transforms exceptions into user-friendly JSON responses.

#### [NEW] `backend/app/middleware/rate_limiter.py`
Rate limiting middleware using in-memory sliding window:
- Per-user limits (authenticated)
- Per-IP limits (unauthenticated)
- Configurable limits via `config.py`

#### [MODIFY] `query_executor.py`
- Add query timeout configuration
- Improve connection pooling settings
- Add graceful error message transformation
- Add SQL validation using `sqlparse`

#### [MODIFY] `main.py`
- Register error handler middleware
- Register rate limiter middleware
- Configure enhanced connection pool settings

#### [MODIFY] `config.py`
Add settings:
```python
query_timeout_seconds: int = 30
rate_limit_per_minute: int = 60
pool_size: int = 5
pool_max_overflow: int = 10
```

---

### Schema Intelligence

#### [NEW] `backend/app/services/schema_analyzer.py`
Advanced schema analysis service:
- `detect_relationships()` - Analyze foreign keys and naming conventions
- `infer_column_types()` - Smart type inference (date patterns, numeric ranges, etc.)
- `get_enhanced_schema()` - Schema with relationship metadata for LLM context

#### [NEW] `backend/app/services/schema_cache.py`
Schema caching layer:
- In-memory cache with TTL
- Cache invalidation on data source changes
- Reduces introspection overhead

#### [MODIFY] `query_executor.py`
- Integrate with `schema_analyzer.py` for enhanced schema info
- Integrate with `schema_cache.py` for caching
- Improve `recommend_chart_type()` using inferred column types

#### [NEW] `backend/app/models/schema_models.py`
Pydantic models for schema metadata:
- `TableRelationship`
- `EnhancedColumn`
- `EnhancedTable`
- `CachedSchema`

---

## Verification Plan

### Automated Tests

#### Unit Tests for LLM Providers
**File:** [NEW] `backend/tests/test_llm_providers.py`

```bash
# Run from backend directory
cd backend
python -m pytest tests/test_llm_providers.py -v
```

Tests:
- Provider interface compliance
- OpenAI adapter with mocked responses
- Anthropic adapter with mocked responses  
- Ollama adapter with mocked HTTP calls
- Provider selection logic

#### Unit Tests for Error Handling
**File:** [NEW] `backend/tests/test_error_handling.py`

```bash
cd backend
python -m pytest tests/test_error_handling.py -v
```

Tests:
- Exception hierarchy
- Graceful error message formatting
- Rate limiter logic (sliding window)
- Timeout handling

#### Unit Tests for Schema Intelligence
**File:** [NEW] `backend/tests/test_schema_analyzer.py`

```bash
cd backend
python -m pytest tests/test_schema_analyzer.py -v
```

Tests:
- Foreign key relationship detection
- Column type inference accuracy
- Schema cache TTL behavior

---

## Dependencies to Add

Add to `backend/requirements.txt`:

```
anthropic>=0.18.0
sqlparse>=0.4.4
pytest>=7.4.0
pytest-asyncio>=0.21.0
httpx>=0.25.0  # For Ollama HTTP calls
```
