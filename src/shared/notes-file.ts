import type { ResearchNote } from "./messages";

const DATABASE_NAME = "research-helper-pup-files";
const STORE_NAME = "handles";
const NOTES_FILE_KEY = "notes-text-file";

export type WritableNotesFileHandle = FileSystemFileHandle & {
  queryPermission: (options: { mode: "readwrite" }) => Promise<PermissionState>;
  requestPermission: (options: { mode: "readwrite" }) => Promise<PermissionState>;
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open local file settings."));
  });
}

export async function saveNotesFileHandle(handle: WritableNotesFileHandle): Promise<void> {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).put(handle, NOTES_FILE_KEY);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Could not remember the selected file."));
      transaction.onabort = () => reject(transaction.error ?? new Error("Could not remember the selected file."));
    });
  } finally {
    database.close();
  }
}

export async function getNotesFileHandle(): Promise<WritableNotesFileHandle | null> {
  const database = await openDatabase();
  try {
    return await new Promise<WritableNotesFileHandle | null>((resolve, reject) => {
      const request = database.transaction(STORE_NAME, "readonly")
        .objectStore(STORE_NAME)
        .get(NOTES_FILE_KEY);
      request.onsuccess = () => resolve((request.result as WritableNotesFileHandle | undefined) ?? null);
      request.onerror = () => reject(request.error ?? new Error("Could not read the selected file setting."));
    });
  } finally {
    database.close();
  }
}

export async function removeNotesFileHandle(): Promise<void> {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).delete(NOTES_FILE_KEY);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Could not unlink the text file."));
      transaction.onabort = () => reject(transaction.error ?? new Error("Could not unlink the text file."));
    });
  } finally {
    database.close();
  }
}

export function notesAsText(notes: ResearchNote[]): string {
  const entries = notes.map((note) => [
    note.text,
    `Source: ${note.pageTitle || note.url}`,
    `Link: ${note.url}`,
    `Saved: ${new Date(note.createdAt).toLocaleString()}`,
  ].join("\n"));

  return [
    "Research Helper Pup — My Research Notes",
    "This file is maintained by the extension. Editing it manually may be overwritten on the next note save or delete.",
    "",
    ...entries.flatMap((entry) => ["────────────────────────", entry, ""]),
  ].join("\n");
}

export async function writeNotesToFile(
  handle: WritableNotesFileHandle,
  notes: ResearchNote[],
): Promise<void> {
  const writable = await handle.createWritable();
  const writer = writable.getWriter();
  try {
    await writer.write(notesAsText(notes));
  } finally {
    await writer.close();
  }
}
