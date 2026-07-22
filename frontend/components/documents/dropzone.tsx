"use client";

import { useCallback, useRef, useState } from "react";
import { UploadCloud, FileText, Image as ImageIcon, File as FileIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDocumentsStore } from "@/lib/store/documents-store";

const ACCEPTED_EXTENSIONS = [".pdf", ".docx", ".png", ".jpg", ".jpeg", ".tiff", ".tif"];
const MAX_SIZE_MB = 25;

export function Dropzone() {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadFile = useDocumentsStore((s) => s.uploadFile);

  const validateAndUpload = useCallback(
    async (file: File) => {
      setUploadError(null);
      const ext = "." + file.name.split(".").pop()?.toLowerCase();
      if (!ACCEPTED_EXTENSIONS.includes(ext)) {
        setUploadError(`Unsupported file type "${ext}". Accepted: ${ACCEPTED_EXTENSIONS.join(", ")}`);
        return;
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        setUploadError(`File exceeds the ${MAX_SIZE_MB} MB upload limit.`);
        return;
      }

      setIsUploading(true);
      try {
        await uploadFile(file);
      } catch {
        setUploadError("Upload failed. Check your connection and try again.");
      } finally {
        setIsUploading(false);
      }
    },
    [uploadFile]
  );

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void validateAndUpload(file);
  }

  function handleBrowse(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void validateAndUpload(file);
    e.target.value = "";
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[var(--radius-card)] border-2 border-dashed px-6 py-12 text-center transition-colors",
          isDragging
            ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]"
            : "border-[var(--color-border-strong)] bg-white/[0.015] hover:border-[var(--color-text-muted)] hover:bg-white/[0.03]"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={ACCEPTED_EXTENSIONS.join(",")}
          onChange={handleBrowse}
        />
        <div
          className={cn(
            "flex size-12 items-center justify-center rounded-full transition-colors",
            isDragging
              ? "bg-[var(--color-accent)] text-white"
              : "bg-white/[0.05] text-[var(--color-text-secondary)]"
          )}
        >
          <UploadCloud className="size-5" strokeWidth={2} />
        </div>
        <div>
          <p className="text-sm font-medium text-[var(--color-text-primary)]">
            {isUploading ? "Uploading…" : "Drop a document here, or click to browse"}
          </p>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            PDF, DOCX, scanned images — up to {MAX_SIZE_MB} MB
          </p>
        </div>
        <div className="flex items-center gap-3 text-[var(--color-text-muted)]">
          <FileText className="size-4" strokeWidth={1.75} />
          <ImageIcon className="size-4" strokeWidth={1.75} />
          <FileIcon className="size-4" strokeWidth={1.75} />
        </div>
      </div>
      {uploadError && (
        <p className="mt-2 text-xs text-[var(--color-critical)]">{uploadError}</p>
      )}
    </div>
  );
}
