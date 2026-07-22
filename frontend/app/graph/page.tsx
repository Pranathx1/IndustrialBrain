"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Share2, AlertTriangle } from "lucide-react";
import { graphApi, ApiError, type GraphResponse } from "@/lib/api";

const NODE_COLOR: Record<string, { bg: string; border: string; text: string }> = {
  Equipment: { bg: "#12161f", border: "#5b7fff", text: "#7b9aff" },
  Document: { bg: "#12161f", border: "#34d399", text: "#34d399" },
};

function layoutNodes(nodes: GraphResponse["nodes"]): Node[] {
  const equipment = nodes.filter((n) => n.labels.includes("Equipment"));
  const documents = nodes.filter((n) => n.labels.includes("Document"));

  const positioned: Node[] = [];

  equipment.forEach((n, i) => {
    const angle = (i / Math.max(equipment.length, 1)) * 2 * Math.PI;
    const radius = 180;
    positioned.push({
      id: n.id,
      position: { x: 400 + radius * Math.cos(angle), y: 300 + radius * Math.sin(angle) },
      data: { label: (n.tag as string) ?? (n.name as string) ?? n.id, node: n },
      type: "default",
      style: nodeStyle("Equipment"),
    });
  });

  documents.forEach((n, i) => {
    const angle = (i / Math.max(documents.length, 1)) * 2 * Math.PI;
    const radius = 380;
    positioned.push({
      id: n.id,
      position: { x: 400 + radius * Math.cos(angle), y: 300 + radius * Math.sin(angle) },
      data: { label: truncate((n.filename as string) ?? n.id, 22), node: n },
      type: "default",
      style: nodeStyle("Document"),
    });
  });

  return positioned;
}

function nodeStyle(label: string) {
  const colors = NODE_COLOR[label] ?? NODE_COLOR.Equipment!;
  return {
    background: colors.bg,
    border: `1.5px solid ${colors.border}`,
    borderRadius: 10,
    color: colors.text,
    fontSize: 12,
    fontWeight: 600,
    padding: "8px 14px",
    width: "auto",
  };
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

export default function KnowledgeGraphPage() {
  const [graph, setGraph] = useState<GraphResponse | null>(null);
  const [state, setState] = useState<"loading" | "success" | "error" | "empty">("loading");
  const [searchTag, setSearchTag] = useState("");

  const loadFullGraph = useCallback(() => {
    setState("loading");
    graphApi
      .full()
      .then((res) => {
        setGraph(res);
        setState(res.nodes.length === 0 ? "empty" : "success");
      })
      .catch(() => setState("error"));
  }, []);

  useEffect(() => {
    loadFullGraph();
  }, [loadFullGraph]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchTag.trim()) {
      loadFullGraph();
      return;
    }
    setState("loading");
    graphApi
      .neighborhood(searchTag.trim().toUpperCase())
      .then((res) => {
        setGraph(res);
        setState(res.nodes.length === 0 ? "empty" : "success");
      })
      .catch(() => setState("error"));
  }

  const nodes = useMemo(() => (graph ? layoutNodes(graph.nodes) : []), [graph]);
  const edges: Edge[] = useMemo(
    () =>
      graph
        ? graph.edges.map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            label: e.type,
            style: { stroke: "rgba(255,255,255,0.15)" },
            labelStyle: { fill: "#5c6472", fontSize: 10 },
            markerEnd: { type: MarkerType.ArrowClosed, color: "rgba(255,255,255,0.25)" },
          }))
        : [],
    [graph]
  );

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <form onSubmit={handleSearch} className="relative flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--color-text-muted)]" strokeWidth={2} />
          <input
            value={searchTag}
            onChange={(e) => setSearchTag(e.target.value)}
            placeholder="Search an equipment tag, e.g. C-204…"
            className="w-full rounded-[var(--radius-control)] border border-[var(--color-border-strong)] bg-white/[0.03] py-2.5 pl-10 pr-4 text-sm text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)]"
          />
        </form>
        {graph && (
          <Badge tone={graph.source === "neo4j" ? "success" : "default"} dot>
            {graph.source === "neo4j" ? "Neo4j" : "Derived from document index"}
          </Badge>
        )}
      </div>

      {state === "error" ? (
        <Card className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <AlertTriangle className="size-6 text-[var(--color-critical)]" strokeWidth={2} />
          <p className="text-sm font-medium text-[var(--color-text-primary)]">Couldn&apos;t load the knowledge graph</p>
        </Card>
      ) : state === "empty" ? (
        <Card className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <Share2 className="size-6 text-[var(--color-text-muted)]" strokeWidth={1.75} />
          <p className="text-sm font-medium text-[var(--color-text-primary)]">No graph relationships yet</p>
          <p className="max-w-sm text-xs text-[var(--color-text-muted)]">
            Relationships appear once documents referencing equipment tags have been processed.
          </p>
        </Card>
      ) : state === "loading" ? (
        <Card className="flex-1 animate-pulse" />
      ) : (
        <Card className="flex-1 overflow-hidden p-0">
          <ReactFlow nodes={nodes} edges={edges} fitView proOptions={{ hideAttribution: true }}>
            <Background color="rgba(255,255,255,0.04)" gap={24} />
            <Controls className="!bg-[var(--color-surface)] [&>button]:!border-[var(--color-border)] [&>button]:!bg-transparent [&>button]:!fill-[var(--color-text-secondary)]" />
            <MiniMap
              maskColor="rgba(10,14,20,0.7)"
              style={{ background: "var(--color-surface)" }}
              nodeColor={(n: any) => (n.data?.node?.labels?.includes("Document") ? "#34d399" : "#5b7fff")}
            />
          </ReactFlow>
        </Card>
      )}
    </div>
  );
}
