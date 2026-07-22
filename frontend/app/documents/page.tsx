"use client";

import { useEffect } from "react";
import { Dropzone } from "@/components/documents/dropzone";
import { DocumentTable } from "@/components/documents/document-table";
import { ProcessingPanel } from "@/components/documents/processing-panel";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useDocumentsStore } from "@/lib/store/documents-store";

export default function DocumentsPage() {
  const fetchDocuments = useDocumentsStore((s) => s.fetchDocuments);
  const loadState = useDocumentsStore((s) => s.loadState);
  const errorMessage = useDocumentsStore((s) => s.errorMessage);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  return (
    <div className="flex flex-col gap-6 pb-10">
      <Dropzone />

      {loadState === "error" ? (
        <div className="flex flex-col items-center gap-3 rounded-[var(--radius-card)] border border-[var(--color-border)] py-14 text-center">
          <p className="text-sm font-medium text-[var(--color-text-primary)]">Couldn&apos;t load documents</p>
          <p className="max-w-sm text-xs text-[var(--color-text-muted)]">{errorMessage}</p>
          <Button variant="secondary" size="sm" onClick={fetchDocuments}>
            <RefreshCw className="size-3.5" strokeWidth={2} />
            Retry
          </Button>
        </div>
      ) : (
        <DocumentTable />
      )}

      <ProcessingPanel />
    </div>
  );
}
