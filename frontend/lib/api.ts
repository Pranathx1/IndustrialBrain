/**
 * Typed client for the IndustrialBrain AI backend — scoped to exactly
 * the 5 modules in this prototype. One place to change the base URL
 * or error handling for every request in the app.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(body.detail ?? "Request failed", res.status);
  }
  return res.json() as Promise<T>;
}

// --- Dashboard ---

export interface KpiCard {
  id: string;
  label: string;
  value: string;
  unit: string | null;
  delta: string | null;
  trend: string | null;
  tone: string;
}

export interface AssetHealthPoint {
  month: string;
  healthy: number;
  warning: number;
  critical: number;
}

export interface ActivityItem {
  id: string;
  title: string;
  detail: string;
  timestamp: string;
  actor: string;
}

export interface DashboardSummary {
  kpis: KpiCard[];
  asset_health_trend: AssetHealthPoint[];
  recent_activity: ActivityItem[];
  generated_at: string;
}

export const dashboardApi = {
  async summary(): Promise<DashboardSummary> {
    const res = await fetch(`${API_BASE_URL}/dashboard/summary`);
    return handleResponse(res);
  },
};

// --- Document Intelligence ---

export type DocumentStatus =
  | "queued"
  | "ocr"
  | "entity_extraction"
  | "embedding"
  | "knowledge_graph"
  | "complete"
  | "failed";

export interface DocumentSummary {
  id: string;
  filename: string;
  doc_type: "pdf" | "docx" | "image";
  status: DocumentStatus;
  error_message: string | null;
  ocr_confidence: number | null;
  uploaded_at: string;
  uploaded_by: string;
}

export interface StageEvent {
  stage: string;
  status: "started" | "completed" | string;
  timestamp: string;
}

export interface ExtractedEntity {
  entity_type: string;
  value: string;
  confidence: number;
  context_snippet: string | null;
}

export interface DocumentDetail extends DocumentSummary {
  extracted_text_preview: string | null;
  stage_history: StageEvent[];
  entities: ExtractedEntity[];
}

export const documentsApi = {
  async list(): Promise<DocumentSummary[]> {
    const res = await fetch(`${API_BASE_URL}/documents`);
    return handleResponse(res);
  },
  async get(id: string): Promise<DocumentDetail> {
    const res = await fetch(`${API_BASE_URL}/documents/${id}`);
    return handleResponse(res);
  },
  async upload(file: File): Promise<{ document: DocumentSummary }> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_BASE_URL}/documents/upload`, { method: "POST", body: formData });
    return handleResponse(res);
  },
};

// --- AI Copilot ---

export interface CopilotSource {
  filename: string;
  document_id: string;
  snippet: string;
}

export interface CopilotResponse {
  answer: string;
  confidence: number;
  sources: CopilotSource[];
  reasoning_available: boolean;
  suggested_followups: string[];
}

export const copilotApi = {
  async suggestions(): Promise<string[]> {
    const res = await fetch(`${API_BASE_URL}/copilot/suggestions`);
    return handleResponse(res);
  },
  async query(query: string): Promise<CopilotResponse> {
    const res = await fetch(`${API_BASE_URL}/copilot/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    return handleResponse(res);
  },
};

// --- Root Cause Analysis ---

export interface IncidentOut {
  id: string;
  asset_tag: string;
  asset_name: string;
  title: string;
  description: string;
  severity: string;
  occurred_at: string;
}

export interface EvidenceOut {
  source: string;
  detail: string;
}

export interface CandidateCauseOut {
  cause: string;
  confidence: number;
  evidence: EvidenceOut[];
  recommendation: string;
}

export interface RCAAnalysisOut {
  incident_id: string;
  candidate_causes: CandidateCauseOut[];
  similar_incidents: { id: string; title: string; occurred_at: string; severity: string }[];
  timeline: { date: string; label: string; type: string }[];
}

export const rcaApi = {
  async listIncidents(): Promise<IncidentOut[]> {
    const res = await fetch(`${API_BASE_URL}/rca/incidents`);
    return handleResponse(res);
  },
  async analyze(incidentId: string): Promise<RCAAnalysisOut> {
    const res = await fetch(`${API_BASE_URL}/rca/analyze/${incidentId}`, { method: "POST" });
    return handleResponse(res);
  },
};

// --- Knowledge Graph ---

export interface GraphNode {
  id: string;
  labels: string[];
  [key: string]: unknown;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
}

export interface GraphResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
  source: string;
}

export const graphApi = {
  async full(): Promise<GraphResponse> {
    const res = await fetch(`${API_BASE_URL}/graph`);
    return handleResponse(res);
  },
  async neighborhood(assetTag: string): Promise<GraphResponse> {
    const res = await fetch(`${API_BASE_URL}/graph/entity/${assetTag}`);
    return handleResponse(res);
  },
};
