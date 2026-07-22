import { create } from "zustand";
import { documentsApi, ApiError, type DocumentSummary, type DocumentDetail } from "@/lib/api";

interface DocumentsState {
  documents: DocumentSummary[];
  loadState: "loading" | "success" | "empty" | "error";
  errorMessage: string | null;

  /** id of the document currently shown in the processing panel, if any */
  activeDocumentId: string | null;
  activeDocument: DocumentDetail | null;

  fetchDocuments: () => Promise<void>;
  uploadFile: (file: File) => Promise<void>;
  openProcessingPanel: (id: string) => void;
  closeProcessingPanel: () => void;
}

const POLL_INTERVAL_MS = 900;
const TERMINAL_STATUSES = new Set(["complete", "failed"]);

export const useDocumentsStore = create<DocumentsState>((set, get) => ({
  documents: [],
  loadState: "loading",
  errorMessage: null,
  activeDocumentId: null,
  activeDocument: null,

  async fetchDocuments() {
    set({ loadState: "loading", errorMessage: null });
    try {
      const documents = await documentsApi.list();
      set({ documents, loadState: documents.length === 0 ? "empty" : "success" });
    } catch (err) {
      set({
        loadState: "error",
        errorMessage: err instanceof ApiError ? err.message : "Couldn't reach the document service.",
      });
    }
  },

  async uploadFile(file: File) {
    const { document } = await documentsApi.upload(file);
    set((state) => ({
      documents: [document, ...state.documents],
      loadState: "success",
    }));
    get().openProcessingPanel(document.id);
  },

  openProcessingPanel(id: string) {
    set({ activeDocumentId: id, activeDocument: null });
    pollDocument(id, set, get);
  },

  closeProcessingPanel() {
    set({ activeDocumentId: null, activeDocument: null });
  },
}));

/** Polls a single document until it reaches a terminal state, updating
 * both the detail panel and the corresponding row in the list. */
function pollDocument(
  id: string,
  set: (partial: Partial<DocumentsState> | ((s: DocumentsState) => Partial<DocumentsState>)) => void,
  get: () => DocumentsState
) {
  const tick = async () => {
    // Stop polling if the panel was closed or switched to a different document.
    if (get().activeDocumentId !== id) return;

    try {
      const detail = await documentsApi.get(id);
      if (get().activeDocumentId !== id) return;

      set((state) => ({
        activeDocument: detail,
        documents: state.documents.map((d) => (d.id === id ? { ...d, ...detail } : d)),
      }));

      if (!TERMINAL_STATUSES.has(detail.status)) {
        setTimeout(tick, POLL_INTERVAL_MS);
      }
    } catch {
      // Transient network errors during polling don't tear down the
      // panel — just retry on the next interval.
      setTimeout(tick, POLL_INTERVAL_MS);
    }
  };

  tick();
}
