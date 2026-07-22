"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X, Check, Loader2, AlertTriangle, FileSearch, Tags, Boxes, Share2, CircleCheck } from "lucide-react";
import { useDocumentsStore } from "@/lib/store/documents-store";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { DocumentStatus } from "@/lib/api";

const PIPELINE_STAGES: { key: DocumentStatus; label: string; icon: React.ElementType }[] = [
  { key: "queued", label: "Upload received", icon: FileSearch },
  { key: "ocr", label: "OCR", icon: FileSearch },
  { key: "entity_extraction", label: "Entity extraction", icon: Tags },
  { key: "embedding", label: "Embedding", icon: Boxes },
  { key: "knowledge_graph", label: "Knowledge graph creation", icon: Share2 },
  { key: "complete", label: "Complete", icon: CircleCheck },
];

const STAGE_ORDER = PIPELINE_STAGES.map((s) => s.key);

const ENTITY_TYPE_LABEL: Record<string, string> = {
  equipment_tag: "Equipment tag",
  standard_reference: "Standard reference",
  date: "Date",
  pressure_value: "Pressure",
  temperature_value: "Temperature",
  personnel_role: "Personnel role",
};

export function ProcessingPanel() {
  const activeDocumentId = useDocumentsStore((s) => s.activeDocumentId);
  const activeDocument = useDocumentsStore((s) => s.activeDocument);
  const closeProcessingPanel = useDocumentsStore((s) => s.closeProcessingPanel);

  return (
    <AnimatePresence>
      {activeDocumentId && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeProcessingPanel}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 300 }}
            className="glass fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-[var(--color-border-strong)]"
          >
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
                  {activeDocument?.filename ?? "Processing document…"}
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">Document Intelligence pipeline</p>
              </div>
              <button
                onClick={closeProcessingPanel}
                className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-[var(--color-text-muted)] transition-colors hover:bg-white/[0.06] hover:text-[var(--color-text-primary)]"
                aria-label="Close panel"
              >
                <X className="size-4" strokeWidth={2} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              {!activeDocument ? (
                <TimelineSkeleton />
              ) : activeDocument.status === "failed" ? (
                <FailedState message={activeDocument.error_message} />
              ) : (
                <>
                  <Timeline document={activeDocument} />
                  {activeDocument.status === "complete" && <EntitiesSection document={activeDocument} />}
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Timeline({ document }: { document: NonNullable<ReturnType<typeof useDocumentsStore.getState>["activeDocument"]> }) {
  const currentIndex = STAGE_ORDER.indexOf(document.status);

  return (
    <ol className="flex flex-col">
      {PIPELINE_STAGES.map((stage, i) => {
        const isDone = i < currentIndex || document.status === "complete";
        const isActive = i === currentIndex && document.status !== "complete";
        const Icon = stage.icon;

        return (
          <li key={stage.key} className="flex gap-3.5">
            <div className="flex flex-col items-center">
              <motion.div
                initial={false}
                animate={{
                  scale: isActive ? 1.08 : 1,
                }}
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  isDone && "border-[var(--color-success)] bg-[var(--color-success-soft)] text-[var(--color-success)]",
                  isActive && "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent-strong)]",
                  !isDone && !isActive && "border-[var(--color-border-strong)] text-[var(--color-text-muted)]"
                )}
              >
                {isDone ? (
                  <Check className="size-4" strokeWidth={2.5} />
                ) : isActive ? (
                  <Loader2 className="size-4 animate-spin" strokeWidth={2.5} />
                ) : (
                  <Icon className="size-3.5" strokeWidth={2} />
                )}
              </motion.div>
              {i < PIPELINE_STAGES.length - 1 && (
                <div
                  className={cn(
                    "my-0.5 w-0.5 flex-1",
                    isDone ? "bg-[var(--color-success)]" : "bg-[var(--color-border-strong)]"
                  )}
                  style={{ minHeight: 28 }}
                />
              )}
            </div>
            <div className={cn("pb-7", i === PIPELINE_STAGES.length - 1 && "pb-0")}>
              <p
                className={cn(
                  "pt-1 text-[13px] font-medium",
                  isDone && "text-[var(--color-text-primary)]",
                  isActive && "text-[var(--color-accent-strong)]",
                  !isDone && !isActive && "text-[var(--color-text-muted)]"
                )}
              >
                {stage.label}
              </p>
              {stage.key === "ocr" && isDone && document.ocr_confidence !== null && (
                <p className="mt-0.5 font-mono-tabular text-[11px] text-[var(--color-text-muted)]">
                  {document.ocr_confidence.toFixed(1)}% confidence
                </p>
              )}
              {stage.key === "entity_extraction" && isDone && (
                <p className="mt-0.5 font-mono-tabular text-[11px] text-[var(--color-text-muted)]">
                  {document.entities.length} entities found
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function EntitiesSection({ document }: { document: NonNullable<ReturnType<typeof useDocumentsStore.getState>["activeDocument"]> }) {
  const grouped = document.entities.reduce<Record<string, typeof document.entities>>((acc, entity) => {
    (acc[entity.entity_type] ??= []).push(entity);
    return acc;
  }, {});

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="mt-6 border-t border-[var(--color-border)] pt-5"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
        Extracted entities
      </p>
      <div className="mt-3 flex flex-col gap-4">
        {Object.entries(grouped).map(([type, entities]) => (
          <div key={type}>
            <p className="mb-1.5 text-[11px] font-medium text-[var(--color-text-secondary)]">
              {ENTITY_TYPE_LABEL[type] ?? type}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {entities.map((entity, i) => (
                <div
                  key={i}
                  title={entity.context_snippet ?? undefined}
                  className="flex items-center gap-1.5 rounded-[var(--radius-control)] border border-[var(--color-border-strong)] bg-white/[0.03] px-2.5 py-1.5"
                >
                  <span className="font-mono-tabular text-xs text-[var(--color-text-primary)]">{entity.value}</span>
                  <span className="font-mono-tabular text-[10px] text-[var(--color-success)]">
                    {Math.round(entity.confidence * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
        {document.entities.length === 0 && (
          <p className="text-xs text-[var(--color-text-muted)]">No structured entities were found in this document.</p>
        )}
      </div>
    </motion.div>
  );
}

function TimelineSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3.5">
          <div className="size-8 animate-pulse rounded-full bg-white/[0.06]" />
          <div className="h-3.5 w-40 animate-pulse rounded bg-white/[0.06]" />
        </div>
      ))}
    </div>
  );
}

function FailedState({ message }: { message: string | null }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <div className="flex size-11 items-center justify-center rounded-full bg-[var(--color-critical-soft)] text-[var(--color-critical)]">
        <AlertTriangle className="size-5" strokeWidth={2} />
      </div>
      <p className="text-sm font-medium text-[var(--color-text-primary)]">Processing failed</p>
      <p className="max-w-xs text-xs text-[var(--color-text-muted)]">
        {message ?? "An unexpected error occurred while processing this document."}
      </p>
    </div>
  );
}
