# IndustrialBrain AI

<div align="center">

### The Enterprise Intelligence Layer for Industrial Operations

*Turning scattered industrial documents into a searchable, reasoning knowledge layer*

![Status](https://img.shields.io/badge/status-working%20prototype-success)
![Frontend](https://img.shields.io/badge/frontend-Next.js%2015%20%2B%20React%2019-black)
![Backend](https://img.shields.io/badge/backend-FastAPI-009688)
![AI](https://img.shields.io/badge/AI-Gemini%20%2B%20LangGraph-4285F4)
![License](https://img.shields.io/badge/license-Hackathon%20Prototype-lightgrey)

**[Live Demo](#demo-script)** · **[Architecture](#architecture)** · **[Setup](#running-it-locally)** · **[Why It's Real](#why-this-isnt-a-toy-demo)**

</div>

---

## The Problem

Industrial plants generate a staggering volume of unstructured knowledge — inspection reports, maintenance logs, safety manuals, incident records — and almost none of it talks to each other. Engineers routinely spend hours searching for information that already exists somewhere in a PDF nobody indexed. When something fails, root cause analysis relies on institutional memory rather than the evidence sitting in a filing system. The knowledge exists. It just isn't *connected* or *queryable*.

**IndustrialBrain AI closes that gap** — one deliberately narrow, deeply real workflow: upload a document, watch it become structured knowledge in real time, ask questions about it in plain English, get cited answers, and see how it all connects.

---

## The Story This Prototype Tells

Engineer opens dashboard
│
▼
Uploads an industrial PDF or scanned image
│
▼
Real OCR + entity extraction runs live
(Tesseract actually executes — not simulated)
│
▼
Document becomes searchable knowledge
(chunked, embedded, indexed in Qdrant)
│
▼
Engineer asks a question in plain English
│
▼
AI retrieves relevant context (RAG)
│
▼
Gemini generates an answer — every claim cited
│
▼
Root Cause Analysis surfaces ranked causes,
each backed by real evidence
│
▼
Knowledge Graph visualizes how it all connects

Every arrow in that diagram is a real, working code path — verified end to end, not mocked for the demo.

---

## What's Built

| Module | Capability |
|---|---|
| 📊 **Dashboard** | Live KPIs (asset health, document count), 6-month health trend, real-time activity feed |
| 📄 **Document Intelligence** | Drag-and-drop upload → animated live pipeline (OCR → entity extraction → embedding → knowledge graph) → extracted entities with confidence scores |
| 🤖 **AI Copilot** | Conversational RAG — real vector retrieval, real Gemini-generated answers, every claim traced to its source document |
| 🔍 **Root Cause Analysis** | Select an incident → ranked candidate causes, each with supporting evidence and a concrete recommendation |
| 🕸️ **Knowledge Graph** | Interactive React Flow visualization of equipment ↔ document relationships, searchable |

**Scoped out deliberately**, not by oversight: authentication, admin panel, ERP/IoT integration, billing, a full compliance engine. Shipping one polished, fully-real workflow beats five shallow ones — the Dashboard's Compliance Score and AI Agent Status are clearly-labeled sample analytics, not a built compliance system.

---

## Why This Isn't a Toy Demo

Every "AI-powered" claim below is independently verifiable in the code, not asserted:

| Claim | Proof |
|---|---|
| **OCR is real** | Tesseract actually executes on every upload via `pytesseract`; scanned PDFs are rasterized with `pdftoppm` first. Not a progress-bar animation over a no-op. |
| **Retrieval is real** | Documents are chunked, embedded, and indexed into Qdrant. The Copilot performs genuine vector similarity search — it doesn't keyword-match. |
| **Generation is real** | Answers are synthesized by Gemini from retrieved context. If the API is ever unavailable, the app **degrades gracefully** to returning raw retrieved evidence — it never crashes, and it's honest about which mode it's in. |
| **RCA reasoning is real** | Candidate causes are derived from actual evidence — prior incidents on the same asset, maintenance history, keyword-pattern matching against real records. Confidence scores reflect *how much evidence exists*, not random numbers. |
| **The Knowledge Graph has a real fallback** | Works with **zero Neo4j setup** by deriving relationships directly from indexed documents in Postgres, and upgrades transparently to real Cypher queries the moment Neo4j is provisioned. |

---

## Architecture
'''
industrialbrain/
├── frontend/ Next.js 15 · React 19 · TypeScript
│ ├── app/
│ │ ├── page.tsx Dashboard
│ │ ├── documents/ Document Intelligence
│ │ ├── copilot/ AI Copilot
│ │ ├── rca/ Root Cause Analysis
│ │ └── graph/ Knowledge Graph
│ ├── components/ Reusable UI primitives + module components
│ └── lib/ Typed API client · Zustand state stores
│
└── backend/ FastAPI · Python · async SQLAlchemy
└── app/
├── main.py Entrypoint
├── api/v1/ One route module per feature
├── database/ Models + seed data (Asset, Incident, Document)
├── ocr/ Real Tesseract + pypdf extraction pipeline
├── services/ Entity extraction · RCA reasoning engine
├── rag/ Chunk → embed → retrieve → generate
├── vectordb/ Qdrant client
├── graph/ Neo4j client + Postgres-derived fallback
└── agents/ LangGraph StateGraph — real multi-agent
orchestration for the Copilot pipeline
'''
### Design Principle: Zero-Config Resilience

Every external dependency degrades gracefully rather than blocking the demo:

| Dependency | If missing | If present |
|---|---|---|
| Postgres | Falls back to SQLite | Production-grade persistence |
| Qdrant server | Runs in-memory | Persists across restarts |
| Neo4j | Graph derives from Postgres | True Cypher-based multi-hop traversal |
| Gemini API key | Copilot returns real retrieved evidence, honestly labeled | Full generative synthesis with citations |

This isn't a corner cut — it's a deliberate engineering choice so the app is **always demoable**, regardless of what infrastructure happens to be available in the room.

---

## Tech Stack

**Frontend** — Next.js 15 · React 19 · TypeScript · Tailwind CSS · Framer Motion · React Flow · Recharts · Zustand

**Backend** — FastAPI · Python · SQLAlchemy (async) · Pydantic

**AI / Data** — Gemini (generation + embeddings) · LangGraph (real StateGraph orchestration) · Qdrant (vector search) · Tesseract + pypdf (OCR) · Neo4j (optional graph backend)

---

## Running It Locally

### Prerequisites
```bash
# Debian/Ubuntu
sudo apt-get install tesseract-ocr poppler-utils
# macOS
brew install tesseract poppler
# Windows: install both from their official installers, add to PATH
```

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

pip install -r requirements.txt
pip install aiosqlite

cp .env.example .env
# edit .env → DATABASE_URL=sqlite+aiosqlite:///./dev.db

python -m app.database.seed
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

Open **http://localhost:3000**.

## Demo Script

1. **Dashboard** — real KPIs, live trend chart
2. **Document Intelligence** — upload a scanned inspection report; watch OCR → entity extraction → embedding → knowledge graph happen live, in real time
3. **AI Copilot** — ask a question about the document just uploaded; get a generated, cited answer
4. **Root Cause Analysis** — select an incident; see ranked causes with real supporting evidence
5. **Knowledge Graph** — search the equipment tag from the uploaded document; watch it appear connected

---

## What We'd Build Next

- Real-time IoT sensor ingestion feeding the Maintenance timeline directly
- Multi-hop Knowledge Graph reasoning via full Neo4j Cypher queries
- Fine-tuned entity extraction on a larger labeled industrial-document corpus
- Role-based access control for multi-team deployments

---

<div align="center">

Built for **AI for Industrial Knowledge Intelligence — Unified Asset & Operations Brain**

</div>
