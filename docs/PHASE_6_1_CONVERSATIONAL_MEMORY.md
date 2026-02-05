# Phase 6.1: Conversational Memory (Chat-like Interface)

This phase introduces multi-turn conversations with data, enabling users to ask follow-up questions that inherit context from previous exchanges.

## Architecture

### 1. Database Schema
- **`conversation_threads`**: Stores thread metadata (user, data source, title).
- **`thread_messages`**: Stores individual messages with roles (`user`, `assistant`), content, generated SQL, and chart recommendations.

### 2. LLM Integration
- The `generate_sql` interface now accepts an optional `conversation_history` list.
- **Context Injection**: Previous Q&A pairs are injected into the LLM prompt as prior messages, allowing the model to understand references like *"Filter that by year"* or *"Now show it as a donut chart"*.

### 3. API Endpoints
- `POST /api/threads/`: Create a new thread.
- `GET /api/threads/`: List threads for a data source.
- `GET /api/threads/{id}`: Get thread history.
- `POST /api/query`: Updated to accept `thread_id`. When provided, messages are automatically saved to the thread.

## UI/UX Enhancements

### Interactive Chat Interface
Located on the "Ask" page via the "Conversational" toggle.
- **Context Preservation**: A sidebar lists recent analysis sessions.
- **Live Preview**: SQL and AI interpretations are displayed inline within the chat bubble.
- **Auto-Scroll**: Smooth transitions as new analytical insights are generated.

### Technical Stack
- **Backend**: FastAPI, SQLAlchemy, OpenAI/Anthropic/Ollama API.
- **Frontend**: Next.js (App Router), Tailwind CSS, Lucide Icons, date-fns.

## Verification
- [x] Multi-turn context preservation (verified via prompt inspection).
- [x] Thread-persistence across sessions.
- [x] Data source isolation (threads are tied to specific datasets).
