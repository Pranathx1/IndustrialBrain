"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Image as ImageIcon, File as FileIcon, Inbox } from "lucide-react";
import { useDocumentsStore } from "@/lib/store/documents-store";
import type { DocumentStatus, DocumentSummary } from "@/lib/api";

const STATUS_META: Record<DocumentStatus, { label: string; tone: "default" | "accent" | "success" | "warning" | "critical" }> = {
  queued: { label: "Queued", tone: "default" },
  ocr: { label: "Running OCR", tone: "accent" },
  entity_extraction: { label: "Extracting entities", tone: "accent" },
  embedding: { label: "Embedding", tone: "accent" },
  knowledge_graph: { label: "Updating graph", tone: "accent" },
  complete: { label: "Complete", tone: "success" },
  failed: { label: "Failed", tone: "critical" },
};

const TYPE_ICON = { pdf: FileText, docx: FileText, image: ImageIcon } as const;

export function DocumentTable() {
  const { documents, loadState } = useDocumentsStore();
  const openProcessingPanel = useDocumentsStore((s) => s.openProcessingPanel);

  if (loadState === "loading") return <DocumentTableSkeleton />;
  if (loadState === "empty") return <DocumentTableEmpty />;

  return (
    <Card className="overflow-hidden">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--color-border)]">
            <Th>Document</Th>
            <Th>Status</Th>
            <Th>OCR confidence</Th>
            <Th>Uploaded</Th>
          </tr>
        </thead>
        <tbody>
          {documents.map((doc) => (
            <DocumentRow key={doc.id} doc={doc} onClick={() => openProcessingPanel(doc.id)} />
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-5 py-3 text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
      {children}
    </th>
  );
}

function DocumentRow({ doc, onClick }: { doc: DocumentSummary; onClick: () => void }) {
  const meta = STATUS_META[doc.status];
  const Icon = TYPE_ICON[doc.doc_type];
  const isActive = !["complete", "failed"].includes(doc.status);

  return (
    <tr
      onClick={onClick}
      className="cursor-pointer border-b border-[var(--color-border)] transition-colors last:border-0 hover:bg-white/[0.02]"
    >
      <td className="flex items-center gap-2.5 px-5 py-3.5">
        <Icon className="size-4 shrink-0 text-[var(--color-text-muted)]" strokeWidth={1.75} />
        <span className="truncate text-[13px] font-medium text-[var(--color-text-primary)]">{doc.filename}</span>
      </td>
      <td className="px-5 py-3.5">
        <Badge tone={meta.tone} dot={isActive}>
          {isActive && (
            <span className="mr-0.5 inline-block size-1.5 animate-pulse rounded-full bg-current" />
          )}
          {meta.label}
        </Badge>
      </td>
      <td className="px-5 py-3.5 font-mono-tabular text-xs text-[var(--color-text-secondary)]">
        {doc.ocr_confidence !== null ? `${doc.ocr_confidence.toFixed(1)}%` : "—"}
      </td>
      <td className="px-5 py-3.5 font-mono-tabular text-xs text-[var(--color-text-muted)]">
        {new Date(doc.uploaded_at).toLocaleString(undefined, {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </td>
    </tr>
  );
}

function DocumentTableSkeleton() {
  return (
    <Card className="p-5">
      <div className="flex flex-col gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 flex-1 max-w-64" />
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </Card>
  );
}

function DocumentTableEmpty() {
  return (
    <Card className="flex flex-col items-center gap-2 px-6 py-14 text-center">
      <div className="flex size-11 items-center justify-center rounded-full bg-white/[0.04] text-[var(--color-text-muted)]">
        <Inbox className="size-5" strokeWidth={1.75} />
      </div>
      <p className="text-sm font-medium text-[var(--color-text-primary)]">No documents yet</p>
      <p className="max-w-sm text-xs text-[var(--color-text-muted)]">
        Upload an inspection report, maintenance log, or engineering drawing above to start building the knowledge layer.
      </p>
    </Card>
  );
}
