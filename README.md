# LinkedIn Sequence Generator

A full-stack application that takes LinkedIn prospect URLs and generates personalized messaging sequences using AI, with configurable tone-of-voice parameters and full transparency into the AI's reasoning process.

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Express.js + TypeScript |
| **Frontend** | React + Vite + TypeScript + Tailwind CSS |
| **Database** | SQLite (via better-sqlite3 + Drizzle ORM) |
| **AI** | OpenAI API (gpt-4o-mini / gpt-4o fallback) |
| **LinkedIn Data** | Proxycurl API |

## Quick Start

### Prerequisites

- Node.js 18+
- An OpenAI API key
- A Proxycurl API key ([get free credits](https://nubela.co/proxycurl))

### Setup

```bash
# Clone the repo
git clone <repo-url>
cd withvalley

# Backend setup
cd backend
npm install
cp .env.example .env
# Edit .env with your API keys
npm run db:generate
npm run db:migrate
npm run dev

# Frontend setup (in a new terminal)
cd frontend
npm install
npm run dev
```

The backend runs on `http://localhost:3001` and the frontend on `http://localhost:5173` (with API proxy to the backend).

---

## Database Schema Decisions

### Why SQLite?

SQLite was chosen for simplicity and zero-infrastructure overhead. For a project of this scope, it provides:
- **Zero setup**: No database server to install or configure
- **Single-file persistence**: Easy to backup, reset, or inspect
- **WAL mode**: Enables concurrent reads during long AI generation writes
- **Sufficient for the use case**: The write patterns here (one sequence at a time, infrequent writes) map well to SQLite's strengths

In production at scale, I'd migrate to PostgreSQL for its JSONB query capabilities and better concurrent write handling.

### Schema Design (5 tables)

**`prospects`** — Cached LinkedIn profile data. The `profile_data` column stores the full raw Proxycurl response as JSON text. This is intentional: LinkedIn profiles are semi-structured and change shape over time. Storing the raw payload future-proofs us against schema changes while letting us extract structured fields (name, company, position) into dedicated columns for querying.

**`tov_configs`** — Tone of Voice parameter sets. Each axis (formality, warmth, directness, humor, enthusiasm) has its own column rather than a single JSON blob. This enables direct querying/filtering by axis (e.g., "show all configs with formality > 0.7") and provides better type safety at the ORM level. The `custom_instructions` field allows free-form overrides for edge cases the numeric axes can't capture.

**`message_sequences`** — The central orchestration entity, tying together a prospect + TOV config + generation request. The `status` field (`pending` → `generating` → `completed` | `failed`) enables tracking in-flight generations and error recovery. `prospect_analysis` is stored as JSON text because the AI's analysis structure is inherently flexible.

**`sequence_messages`** — One row per generated message, normalized out of `message_sequences` because each message has its own thinking process, confidence score, and personalization metadata. The `personalization_points` JSON column stores an array of `{point, source, reasoning}` objects — the number and nature vary per message, making JSON the right choice over a separate join table.

**`ai_generations`** — Full audit trail for every OpenAI API call, including retries and failures. Tracks tokens, estimated cost, latency, raw prompt/response, and status. This is essential for:
- Cost monitoring and optimization
- Debugging prompt issues
- Comparing model performance (gpt-4o-mini vs gpt-4o)
- Understanding retry/failure patterns

### Relationships

```
prospects ──< message_sequences >── tov_configs
                    │
              sequence_messages
                    │
              ai_generations
```

---

## Prompt Engineering Approach

### Two-Pass Architecture

Rather than a single monolithic prompt, the system uses two sequential AI calls:

**Pass 1 — Prospect Analysis**: Takes the raw LinkedIn profile data and produces a structured analysis: professional summary, key interests, potential pain points, personalization hooks, and recommended messaging angles. This separation has two benefits:
1. It forces the AI to "think before writing" — analyzing the prospect deeply before composing messages
2. It produces a reusable analysis artifact that's stored and surfaced to the user

**Pass 2 — Sequence Generation**: Takes the Pass 1 analysis + TOV instructions + company context and generates the full message sequence. Each message includes explicit thinking process, confidence score, and personalization points used.

### TOV Translation

The numeric TOV parameters (0.0–1.0) are translated into natural language instructions through a threshold-based mapping system:

- **0.0–0.3**: Low intensity (e.g., formality 0.2 → "Use casual, conversational language...")
- **0.3–0.7**: Moderate intensity (e.g., formality 0.5 → "Professional yet approachable...")
- **0.7–1.0**: High intensity (e.g., formality 0.9 → "Formal, polished language...")

Each axis produces a calibrated paragraph, and all axes are combined into a tone instruction block injected into the system prompt. This approach was chosen over directly including numbers because LLMs respond better to natural language instructions than numeric scales.

### Structured Output

Both AI passes use OpenAI's `response_format: { type: "json_object" }` to ensure the response is always valid JSON. The prompts include explicit JSON schemas showing the expected structure, which acts as both a constraint and a guide for the model.

---

## AI Integration Patterns

### Retry with Exponential Backoff

Every OpenAI call is wrapped in a retry loop (up to 3 attempts) with exponential backoff (1s → 2s → 4s). If the primary model (`gpt-4o-mini`) exhausts all retries, it falls back to `gpt-4o`. Every attempt — successful or failed — is logged in the `ai_generations` table.

### Cost Tracking

Token counts from each API response are captured and multiplied by per-model cost rates to produce estimated USD costs. These are aggregated per sequence and displayed in the UI.

### Error Isolation

The sequence generator wraps the entire AI pipeline in a try/catch. If any step fails, the sequence record is updated to `status: "failed"` with the error message stored, so the user can see what went wrong without the system entering an inconsistent state.

---

## API Design

### Core Endpoint

```
POST /api/sequences/generate
```

Accepts a LinkedIn URL, inline TOV parameters (or a reference to a saved config), company context, and desired sequence length. Returns the full generated sequence with messages, thinking process, confidence scores, prospect analysis, and AI cost metadata.

### Supporting Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/sequences` | List sequences (paginated) |
| `GET` | `/api/sequences/:id` | Full sequence detail |
| `POST` | `/api/tov-configs` | Create TOV preset |
| `GET` | `/api/tov-configs` | List all presets |
| `GET` | `/api/tov-configs/:id` | Get preset |
| `PUT` | `/api/tov-configs/:id` | Update preset |
| `DELETE` | `/api/tov-configs/:id` | Delete preset |
| `GET` | `/api/prospects` | List cached prospects |
| `GET` | `/api/prospects/:id` | Get prospect profile |
| `GET` | `/api/health` | Health check |

### Validation

All request bodies are validated with Zod schemas before reaching route handlers. Invalid requests return 400 with structured error details showing exactly which fields failed and why.

---

## What I'd Improve With More Time

1. **Streaming**: Use Server-Sent Events (SSE) to stream AI generation progress to the frontend in real-time, rather than waiting for the full sequence to complete.

2. **Queue-based generation**: Move AI calls to a background job queue (e.g., BullMQ) so the API responds immediately with a sequence ID and the client polls/subscribes for completion. This prevents HTTP timeout issues with long generations.

3. **A/B testing TOV configs**: Allow generating multiple sequences with different TOV settings for the same prospect, then comparing them side-by-side to optimize messaging.

4. **Prompt versioning**: Version-control prompts in the database so we can track which prompt version produced which output, and roll back if quality degrades.

5. **Rate limiting**: Add per-IP and per-API-key rate limiting to prevent abuse of the generation endpoint.

6. **Caching layer**: Add Redis or in-memory caching for Proxycurl responses and frequently accessed sequences.

7. **PostgreSQL migration**: For production, migrate to PostgreSQL for native JSONB queries, better concurrent write handling, and full-text search on message content.

8. **Testing**: Add integration tests for the API endpoints and unit tests for the TOV translator and prompt builder.

9. **Auth**: Add user authentication so TOV configs and sequences are scoped to individual users/teams.

10. **Webhook notifications**: Notify external systems when a sequence is completed (useful for CRM integrations).
