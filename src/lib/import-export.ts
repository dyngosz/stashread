// JSON/CSV/Pocket HTML import and export. Phase 2 implementation.
import type { ImportResult } from "./models";

export async function exportJSON(): Promise<Blob> {
  throw new Error("Not implemented - Phase 2");
}

export async function exportCSV(): Promise<Blob> {
  throw new Error("Not implemented - Phase 2");
}

export async function importJSON(_file: File): Promise<ImportResult> {
  throw new Error("Not implemented - Phase 2");
}

export async function importPocketHTML(_file: File): Promise<ImportResult> {
  throw new Error("Not implemented - Phase 2");
}

export async function importBookmarks(_folderId: string): Promise<ImportResult> {
  throw new Error("Not implemented - Phase 2");
}
