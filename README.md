# IndustrialBrain AI

**The Enterprise Intelligence Layer for Industrial Operations.**

A hackathon prototype demonstrating one complete, polished end-to-end
workflow: upload an industrial document → OCR + entity extraction →
ask questions about it via AI Copilot → run root cause analysis on an
incident → explore the knowledge graph connecting it all.

Built for PS: *AI for Industrial Knowledge Intelligence — Unified
Asset & Operations Brain*.

---

## What's in scope

Exactly 5 modules, per the hackathon brief:

1. **Dashboard** — KPI cards (Asset Health, Document Count, Compliance
   Score, AI Agent Status), a 6-month asset health trend chart, and a
   live recent-activity feed.
2. **Document Intelligence** — drag-and-drop upload, an animated
   processing pipeline (OCR → entity extraction → embedding →
   knowledge graph), extracted entities with confidence scores.
3. **AI Copilot** — conversational RAG interface with source citations
   and a confidence score on every answer.
4. **Root Cause Analysis** — select an incident, get ranked candidate
   causes with supporting evidence and a recommended action.
5. **Knowledge Graph** — interactive React Flow visualization of how
   equipment and documents connect, with search.

**Explicitly not built** (per the brief): authentication, notifications,
an admin panel, ERP/IoT integration, user management, billing, audit
logs, or a full compliance engine. The Compliance Score and AI Agent
Status KPIs on the dashboard are clearly-labeled sample analytics, not
backed by a real compliance engine — building one was out of scope.

---

## Architecture

```
hackathon/
├── frontend/                     Next.js 15 + React 19 + TypeScript
│   ├── app/
│   │   ├── page.tsx                 Dashboard
│   │   ├── documents/page.tsx        Document Intelligence
│   │   ├── copilot/page.tsx           AI Copilot
│   │   ├── rca/page.tsx                Root Cause Analysis
│   │   └── graph/page.tsx               Knowledge Graph
│   ├── components/
│   │   ├── layout/        Sidebar, Topbar, AppShell
│   │   ├── ui/              Card, Badge, Button, Skeleton
│   │   └── dashboard/ · documents/ · copilot/ · rca/ · graph/
│   └── lib/
│       ├── api.ts             Typed backend client
│       └── store/              Zustand (document upload/polling state)
│
└── backend/                    FastAPI + Python
    └── app/
        ├── main.py                Entrypoint (CORS, router mounting, table creation)
        ├── core/config.py          Every setting has a working zero-config default
        ├── api/v1/                  One route file per module
        ├── database/
        │   ├── session.py            Async SQLAlchemy engine/session
        │   ├── models/                 Document, Asset, Incident, MaintenanceEvent
        │   └── seed.py                  Realistic demo data
        ├── ocr/extractor.py           Real Tesseract + pypdf extraction
        ├── services/
        │   ├── entity_extraction.py     Regex-based industrial entity extraction
        │   ├── document_processor.py     Background pipeline orchestrator
        │   └── rca_engine.py              Rule-based root cause reasoning
        ├── rag/                          Chunk / embed / retrieve / generate
        ├── vectordb/qdrant_client.py     Qdrant vector search
        ├── graph/
        │   ├── neo4j_client.py            Real Neo4j driver (optional)
        │   └── fallback_graph.py           Postgres-derived graph (works with no Neo4j)
        └── agents/copilot_graph.py        Real LangGraph StateGraph orchestration
```

### Design decisions worth knowing about

- **Every external dependency degrades gracefully.** No Postgres? Use
  SQLite. No Qdrant server? It runs in-memory. No Neo4j? The Knowledge
  Graph module derives an equivalent graph from Postgres directly. No
  Gemini API key? The Copilot returns real retrieved evidence with an
  honest "AI synthesis unavailable" note instead of faking a reasoned
  answer. **The whole app runs with zero infrastructure setup** — you
  only add real services to upgrade quality, never to unblock a demo.
- **RCA evidence draws on a `MaintenanceEvent` table** that has no
  dedicated UI page — it exists purely so Root Cause Analysis has
  richer "supporting evidence" to show (e.g. "a bearing replacement
  was already predicted for this asset"), without spending build time
  on a 6th module.
- **OCR is real, not simulated.** Tesseract actually runs; the
  processing animation reflects genuine backend stage transitions
  polled from the database, not a client-side fake timer.

---

## How to run it

### 1. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

You also need two system packages for OCR (the Python packages alone
aren't enough):

```bash
# Debian/Ubuntu
sudo apt-get install tesseract-ocr poppler-utils
# macOS
brew install tesseract poppler
```

Fastest path to running (SQLite, no external services):

```bash
pip install aiosqlite
cp .env.example .env
# then edit .env and set:
#   DATABASE_URL=sqlite+aiosqlite:///./dev.db
python -m app.database.seed        # populates 5 assets, incidents, maintenance history
uvicorn app.main:app --reload --port 8000
```

API docs live at `http://localhost:8000/docs` once it's running.

**Production path** (real Postgres): install Postgres, create a
database, set `DATABASE_URL` in `.env` to your connection string
instead of the SQLite one, then run the same `seed` and `uvicorn`
commands above.

**Optional upgrades** (the app works without these):
- **Neo4j** — set `NEO4J_URI` / `NEO4J_USER` / `NEO4J_PASSWORD` in
  `.env` and run a Neo4j instance; the Knowledge Graph module detects
  it automatically and switches from the Postgres fallback to real
  Cypher queries.
- **Qdrant** — set `QDRANT_URL` to a real Qdrant server instead of
  `:memory:` if you want vector search to persist across restarts.
- **Gemini** — get a free API key from [Google AI
  Studio](https://aistudio.google.com/apikey) and set
  `GEMINI_API_KEY` in `.env`. This unlocks real generated answers in
  the AI Copilot (a paragraph synthesized from retrieved evidence)
  instead of the retrieval-only fallback (which returns the most
  relevant passage found, honestly labeled as such).

### 2. Frontend

In a second terminal:

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

Open `http://localhost:3000`.

---

## How to test it (the demo script)

This is the exact flow the app is built around:

1. **Dashboard** (`/`) — confirm KPI cards and the asset health chart
   load with real seeded data.
2. **Document Intelligence** (`/documents`) — drag in a PDF or image
   (a scanned inspection report works best for a visible OCR-confidence
   number). Watch the processing panel animate through OCR → entity
   extraction → embedding → knowledge graph → complete. Extracted
   entities (equipment tags, dates, pressure readings) appear with
   confidence scores.
3. **AI Copilot** (`/copilot`) — ask a question referencing something
   in the document you just uploaded (e.g. "What was the pressure
   reading?"). The answer cites the source document. Try a question
   mentioning an asset tag like "What's the health status of B-204?"
   — it pulls in live asset context automatically.
4. **Root Cause Analysis** (`/rca`) — select the seeded "High discharge
   temperature alarm" incident. Candidate causes appear ranked by
   confidence, each with supporting evidence and a recommendation.
5. **Knowledge Graph** (`/graph`) — see equipment and document nodes
   connected by extraction relationships; search a tag like `B-204` to
   filter to its neighborhood.

### Automated verification

Every module was tested end-to-end during development:
- Backend: `TestClient`-driven tests against the real pipeline (real
  Tesseract OCR on synthetic documents, real entity extraction, real
  RCA reasoning, real Qdrant retrieval)
- Frontend: `tsc --noEmit` clean, `next build` succeeds
- Full browser integration test (Playwright): real login-free flow
  through all 5 modules against a live backend, confirming correct
  UI state at each step with zero console errors

---

## Known limitations (by design, given the scope)

- No authentication — anyone with the URL has full access, appropriate
  for a demo, not for production.
- Compliance Score and AI Agent Status on the dashboard are sample
  analytics, not live-computed.
- DOCX text extraction isn't implemented (raises a clear error rather
  than silently returning nothing) — PDF and image OCR cover the demo.
- The Postgres-derived Knowledge Graph fallback is smaller than what a
  real Neo4j deployment would show, since it only captures relationships
  already visible in Postgres (equipment ↔ document), not multi-hop
  paths through procedures/regulations.
