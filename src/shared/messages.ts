export type Verdict = "safe" | "unsafe" | "unknown";

export interface CheckRequest {
  type: "CHECK_URL";
  url: string;
}

export interface CheckResponse {
  verdict: Verdict;
  reason: string;
}

export interface ResearchNote {
  id: string;
  text: string;
  pageTitle: string;
  url: string;
  createdAt: number;
}

export interface CaptureSelectionMessage {
  type: "CAPTURE_SELECTION";
}

export interface StoreNoteMessage {
  type: "STORE_NOTE";
  note: ResearchNote;
}

export interface GetNotesMessage {
  type: "GET_NOTES";
}

export interface OpenNotesFilePageMessage {
  type: "OPEN_NOTES_FILE_PAGE";
}

export interface GetNotesFileStatusMessage {
  type: "GET_NOTES_FILE_STATUS";
}

export interface SyncNotesFileMessage {
  type: "SYNC_NOTES_FILE";
}

export interface UnlinkNotesFileMessage {
  type: "UNLINK_NOTES_FILE";
}

export interface DeleteNoteMessage {
  type: "DELETE_NOTE";
  noteId: string;
}

export interface NotesResponse {
  ok: boolean;
  notes?: ResearchNote[];
  error?: string;
}

export interface NotesFileStatusResponse {
  ok: boolean;
  linked?: boolean;
  name?: string;
  permission?: PermissionState;
  error?: string;
}
